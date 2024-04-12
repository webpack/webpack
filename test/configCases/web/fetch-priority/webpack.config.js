/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		crossOriginLoading: "anonymous"
	},
	experiments: {
		css: true
	},
	optimization: {
		minimize: false,
		splitChunks: {
			minSize: 1
		}
	}
};
