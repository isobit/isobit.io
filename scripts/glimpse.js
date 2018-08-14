if ( !window.requestAnimationFrame ) {
	window.requestAnimationFrame = ( function() {
		return window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
			window.setTimeout( callback, 1000 / 60 );
		};
	} )();
}

function GlimpseView(model, element) {
	var self = this;
	this.model = model;
	this.element = element;

	this.renderer = new THREE.WebGLRenderer({alpha: true});
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera(45, 1, 1, 10000);
	this.camera.position.z = 750;
	this.camera.lookAt(this.scene.position);
	this.start = Date.now();

	this.render = function() {
		self.renderer.render(self.scene, self.camera);
	};

	this.toPngURL = function () {
		self.renderer.render(self.scene, self.camera);
		return this.renderer.domElement.toDataURL("image/png");
	};

	this.animate = function() {
		self.model.update.apply(self, [Date.now() - self.start]);
		self.render();
		requestAnimationFrame(self.animate);
	};

	this.resize = function(width, height) {
		this.model.resize.apply(this, [width, height]);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	};

	this.model.init.apply(this);
	this.element.appendChild(this.renderer.domElement);
}

function Glimpse(params) {
	var self = this;
	this.init = params.init;
	this.update = params.update;
	this.resize = params.resize;

	this.createView = function(element) {
		var view = new GlimpseView(self, element);
		view.animate();
		return view;
	};
}
