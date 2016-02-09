import gulp from 'gulp';
import gutil from 'gulp-util';
import run from 'gulp-run';
import webserver from 'gulp-webserver';
import sass from 'gulp-sass';
import plumber from 'gulp-plumber';
import through from 'through2';
import nunjucks from 'nunjucks';
import nunjucksMarkdown from 'nunjucks-markdown';
import marked from 'marked';
import path from 'path';
import del from 'del';
import json5 from 'json5';

// Site Data -----------------------------------------

class SiteData {
	constructor(parser) {
		this._parser = parser;
	}
	update(obj) {
		Object.assign(this, this._parser(obj));
	}
	gulpStreamUpdate() {
		let self = this;
		return through.obj(function(file, enc, cb) {
			self.update(file);
			this.push(file);
			return cb();
		});
	}
}

let site = new SiteData(f => {
	delete require.cache[require.resolve(f.path)];
	return require(f.path).default;
});

// Config --------------------------------------------

let nunjucksEnv = nunjucks.configure(
	['includes', 'layouts'], 
	{watch: false, noCache: true}
);
marked.setOptions({
	highlight: function(code) {
		return require('highlight.js').highlightAuto(code).value;
	}
});
nunjucksMarkdown.register(nunjucksEnv, marked);

// Tasks ---------------------------------------------------------

gulp.task('default', ['site', 'styles', 'assets', 'scripts']);

gulp.task('config', () => {
	return gulp.src('site.js')
		.pipe(errorHandler())
		.pipe(site.gulpStreamUpdate());
});

gulp.task('site', ['config'], () => {
	let root = {};
	return gulp.src('site/**/*')
		.pipe(errorHandler())
		.pipe(extractFrontData())
		.pipe(treeify(root))
		.pipe(renderNunjucks({site, root}, nunjucksEnv))
		.pipe(prettifyUrl())
		.pipe(gulp.dest('www'));
});

gulp.task('scripts', ['config'], () => {
	return gulp.src('scripts/**/*.js')
		.pipe(errorHandler())
		.pipe(renderNunjucks({site}, nunjucksEnv))
		.pipe(gulp.dest(path.join('www', site.scriptsUrl)));
});

gulp.task('styles', ['config'], () => {
	return gulp.src('styles/*.scss')
		.pipe(errorHandler())
		.pipe(renderNunjucks({site}, nunjucksEnv))
		.pipe(sass().on('error', () => {}))
		.pipe(gulp.dest(path.join('www', site.stylesUrl)));
});

gulp.task('assets', ['config'], () => {
	return gulp.src('assets/**/*')
		.pipe(gulp.dest(path.join('www', site.assetsUrl)));
});

gulp.task('serve', ['default'], () => {
	gulp.watch([
		'site.js',
		'assets/**/*', 
		'includes/**/*', 
		'layouts/**/*', 
		'site/**/*', 
		'styles/**/*',
		'scripts/**/*'
	], [
		'default'
	]);
	return gulp.src('www')
		.pipe(webserver({
			livereload: true
		}));
});

gulp.task('clean', () => {
	return del([
		'www'
	]);
});

gulp.task('deploy', ['default'], () => {
	return run('git subtree push --prefix www production www').exec();
});

// Util ---------------------------------------------------------

function errorHandler() { 
	return plumber({errorHandler: function(e) {
		gutil.log(e.toString());
	}}); 
}

function extractFrontData() {
	return through.obj(function(file, enc, cb) {
		try {
			if (file.isBuffer()) {
				let regex = /^([^;]*);;;/;
				let contentString = file.contents.toString();
				let match = regex.exec(contentString);
				let url = path.join(
					'/',
					path.dirname(file.relative), 
					path.basename(file.path, path.extname(file.path))
				);
				let data = {url};
				if (match) {
					file.contents = new Buffer(contentString.replace(regex, ""));
					Object.assign(data, json5.parse('{'+match[1]+'}'));
				}
				file.data = data;
			}
		} catch(e) {
			this.emit('error', new gutil.PluginError('parseFrontData',
				e.message + ' in ' + file.path
			));
		} finally {
			this.push(file);
			return cb();
		}
	});
}

function treeify(dataTarget) {
	function getDeepRef(obj, deepKey) {
		if (typeof(deepKey) === 'string')
			deepKey = deepKey.split('.');
		let target = obj;
		for (let i = 0; i < deepKey.length - 1; i++) {
			let k = deepKey[i];
			if (!target.hasOwnProperty(k)) {
				target[k] = new Object();
			}
			target = target[k];
		}
		let lastKey = deepKey[deepKey.length - 1];
		return {
			isSet() {
				return this.get() !== null && this.get() !== undefined;
			},
			set(v) {
				target[lastKey] = v;
			},
			get(v) {
				return target[lastKey];
			}
		};
	}
	return through.obj(function(file, enc, cb) {
		try {
			let deepKey = file.relative.split('/');
			if (file.isDirectory()) {
				let ref = getDeepRef(dataTarget, deepKey);
				if (ref.get()) {
					if (!ref.get().hasOwnProperty('items'))
						ref.get()[items] = [];
					Object.assign(ref.get(), file.data);
				} else {
					let obj = {items: []};
					Object.assign(obj, file.data);
					ref.set(obj);
				}
			} else if (file.isBuffer()) {
				deepKey[deepKey.length - 1] = 'items';
				let ref = getDeepRef(dataTarget, deepKey);
				if (!ref.isSet()) ref.set([]);
				if (file.hasOwnProperty('data'))
					ref.get().push(file.data);
			}
		} catch(e) {
			this.emit('error', new gutil.PluginError('treeify', e.message));
		} finally {
			if (!this.queue) this.queue = [];
			this.queue.push(file);
			return cb();
		}
	}, function(cb) {
		while (this.queue.length > 0)
			this.push(this.queue.shift());
		return cb();
	});
}

function renderNunjucks(data, env) {
	return through.obj(function(file, enc, cb) {
		try {
			if (file.isBuffer()) {
				let template = nunjucks.compile(file.contents.toString(), env, file.path);
				let ctx = {};
				Object.assign(ctx, data, file.data);
				template.render(ctx, (err, result) => {
					if (err)
						this.emit('error', new gutil.PluginError('nunjucks', err));
					file.contents = new Buffer(result);
					this.push(file);
					cb();
				});
			} else {
				this.push(file);
				return cb();
			}
		} catch(e) {
			this.emit('error', new gutil.PluginError('treeify', e.message));
		}
	});
}

function prettifyUrl() {
	return through.obj(function(file, enc, cb) {
		if (!file.isDirectory()) {
			let id = path.basename(file.path, path.extname(file.path));
			if (id !== 'index') {
				file.path = path.join(
					path.dirname(file.path),
					id,
					'index.html'
				);
			}
		}
		this.push(file);
		return cb();
	});
}
