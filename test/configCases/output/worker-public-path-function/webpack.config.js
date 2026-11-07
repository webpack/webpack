/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	target: "node",
	node: {
		__dirname: false,
		__filename: false
	},
	output: {
		filename: "[name].js",
		workerPublicPathFunction:
			"function(path, publicPath) { return '/worker-custom/' + path; }"
	}
};
