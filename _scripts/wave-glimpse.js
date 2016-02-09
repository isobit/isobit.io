var Wave = new Glimpse({
	init: function() {
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				t: {
					type: "f",
					value: 0.0
				},
				drMax: {
					type: "f",
					value: 10.0
				},
				w: {
					type: "f",
					value: 0.0
				},
				h: {
					type: "f",
					value: 0.0
				}
			},
			wireframe: true,
			vertexShader:
				"uniform float t;" +
				"uniform float drMax;" +
				"uniform float w;" +
				"uniform float h;" +
                "varying vec3 vPosition;" +
				"void main() { " +
                    "vPosition = position;" +
					//"// Calculate a displacement" +
					"float drFactor = sin((t + position.x / w + position.y / (4.0 * h)) * 10.0) * (sin(t / 5.0) + 1.5);" +
					"float dr = drMax * drFactor;" +
					//"// Displace the position along its normal and project it" +
					"vec3 newPosition = position + normal * dr;" +
					"gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);" +
				"}",
			fragmentShader:
                "uniform float w;" +
                "uniform float h;" +
                "varying vec3 vPosition;" +
				"void main() {" +
                    "float alpha = min(1.0, " +
                        "min(" +
                            "-(vPosition.y / 1.5 - h / 2.0) / h," +
                            "((w / 2.0) - abs(vPosition.x)) / w" +
                    "));" +
                    "vec3 color = 0.5 * vec3(1.0, 1.0, 1.0);" +
					"gl_FragColor = vec4(color.rgb * alpha, alpha);" +
				"}"
		});
	},
	update: function(dt) {
		this.material.uniforms['t'].value = .00025 * dt;
	},
	resize: function(width, height) {
		this.material.uniforms['w'].value = width;
		this.material.uniforms['h'].value = height;
		var dx = Math.max(20, Math.round(width / 20));
		var dy = Math.max(20, Math.round(height / 20));
		this.scene.remove(this.mesh);
		this.mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(width * 1.1, height * 1.5, dx, dy),
			this.material
		);
		this.mesh.rotation.x = Math.PI / -3;
		this.mesh.position.y = height / 10;
		this.camera.position.z = height;
		this.scene.add(this.mesh);
	}
});
