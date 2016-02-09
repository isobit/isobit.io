import path from 'path';
export default {
	title: "Isobit",
	description: 
		"A software development blog and project showcase covering topics like " +
		"NodeJS, Scala, Arduino, Particle Photon, IoT, WebGL, and more.",
	githubUsername: "joshglendenning",

	themeColor: '#252525',
	headerColor: '#333',
	brandColor: '#aaa',
	textColor: '#eee',

	baseurl: "",
	scriptsUrl: "/_scripts",
	script(f) { return path.join(this.scriptsUrl, f); },
	stylesUrl: "/_styles",
	style(f) { return path.join(this.stylesUrl, f); },
	assetsUrl: "/_assets",
	asset(f) { return path.join(this.assetsUrl, f); }
};
