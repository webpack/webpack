module.exports = {
	postLoaders: [
		{ test: /extra2\.js/, loader: "raw!extra!val/cacheable" }
	],
	resolve: {
		postprocess: {
			normal: [
				function(filename, callback) {
					callback(null, filename.replace(/extra\.js/, "extra2.js"));
				}
			]
		}
	},
	maxChunks: 2
}