// Canvas toBlob polyfill https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob#Polyfill
if (!HTMLCanvasElement.prototype.toBlob) {
	Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
		value: function (callback, type, quality) {
			var dataURL = this.toDataURL(type, quality).split(',')[1];
			setTimeout(function() {
				var binStr = atob( dataURL ),
					len = binStr.length,
					arr = new Uint8Array(len);
				for (var i = 0; i < len; i++ ) {
					arr[i] = binStr.charCodeAt(i);
				}
				callback( new Blob( [arr], {type: type || 'image/png'} ) );
			});
		}
	});
}

function PixelCanvas(opts) {
	this.canvas = opts.canvas;
	this.vertexShaderSource = opts.vertexShaderSource;
	this.fragmentShaderSource = opts.fragmentShaderSource;
	this.paused = false;
	this.init();
}
PixelCanvas.prototype.init = function() {
	// get webgl context
	var gl = this.gl = 
		this.canvas.getContext("webgl") || 
		this.canvas.getContext("experimental-webgl");

	if (!gl) throw {message: "Could not get webgl context!"};

	// Create gl viewport and setup buffer
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([
			-1.0, -1.0,
			1.0, -1.0,
			-1.0,  1.0,
			-1.0,  1.0,
			1.0, -1.0,
			1.0,  1.0]),
		gl.STATIC_DRAW
	);

	// compile and attach shaders

	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, this.vertexShaderSource);
	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		console.log(gl.getShaderInfoLog(vertexShader));
		throw "Something went wrong compiling shader.";
	}

	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, this.fragmentShaderSource);
	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		console.log(gl.getShaderInfoLog(fragmentShader));
		throw "Something went wrong compiling shader.";
	}

	var program = this.program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	gl.useProgram(program);

	this.timeStart = new Date().getTime();
	this.time = new Date().getTime() - this.timeStart;

	this.registerResize();

	this.animate();
};

PixelCanvas.prototype.registerResize = function() {
	this.deregisterResize();
	this.resizeHandler = () => this.resize();
	window.addEventListener('resize', this.resizeHandler, false);
	this.resize();
};

PixelCanvas.prototype.deregisterResize = function() {
	if (this.resizeHandler == null) return;
	window.removeEventListener('resize', this.resizeHandler, false);
	this.resizeHandler = null;
};

PixelCanvas.prototype.resize = function(w, h) {
	w = w || this.canvas.clientWidth;
	h = h || this.canvas.clientHeight;
	this.canvas.width = w;
	this.canvas.height = h;
	this.gl.viewport(0, 0, w, h);
};

PixelCanvas.prototype.animate = function() {
	window.requestAnimationFrame(this.animate.bind(this), this.canvas);
	this.render();
};

PixelCanvas.prototype.render = function() {
	if (!this.paused)
		this.time = new Date().getTime() - this.timeStart;

	var gl = this.gl;

	gl.clearColor(1., 0., 0., 1.);
	gl.clear(gl.COLOR_BUFFER_BIT);

	var positionLocation = gl.getAttribLocation(this.program, "a_position");
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

	gl.uniform1f(gl.getUniformLocation(this.program, 'time'), this.time / 1000);

	gl.drawArrays(gl.TRIANGLES, 0, 6);
};

PixelCanvas.prototype.pause = function() {
	this.paused = true;
}

PixelCanvas.prototype.resume = function() {
	this.timeStart = new Date().getTime() - this.time;
	this.paused = false;
}

PixelCanvas.prototype.step = function(t=1.0) {
	this.time += t;
	this.render();
}

PixelCanvas.prototype.toBlob = function(callback, w, h, mimeType, quality) {
	var wasPaused = this.paused;
	this.pause();
	this.deregisterResize();
	this.resize(w, h);
	this.render();
	var cb = (function(blob) {
		callback(blob);
		this.registerResize();
		if (!wasPaused) {
			this.resume();
		}
	}).bind(this);
	this.canvas.toBlob(cb, mimeType, quality);
}
