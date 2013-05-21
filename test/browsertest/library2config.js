module.exports = {
	output: {
		hashDigestLength: 5
	},
	module: {
		postLoaders: [
			{ test: /extra2?\.js/, loader: "raw!extra!val?cacheable" }
		]
	},
	optimize: {
		maxChunks: 2,
	},
	amd: {
		fromOptions: true
	},
	provide: {
		s3: "submodule3"
	},
	plugins: [
		function() {
			this.plugin("normal-module-factory", function(nmf) {
				nmf.plugin("after-resolve", function(data, callback) {
					data.resource = data.resource.replace(/extra\.js/, "extra2.js");
					callback(null, data);
				});
			});
		}
	]
}