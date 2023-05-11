/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.mjs",
	experiments: {
		outputModule: true
	},
	name: "esm",
	target: "web",
	output: {
		publicPath: "",
		module: true,
		filename: "bundle0.js",
		chunkFilename: "[name].js",
		crossOriginLoading: "anonymous"
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
