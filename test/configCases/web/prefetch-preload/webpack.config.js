/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		crossOriginLoading: "anonymous"
	},
	performance: {
		hints: false
	},
	experiments: {
		css: true
	},
	optimization: {
		minimize: false
	}
};
