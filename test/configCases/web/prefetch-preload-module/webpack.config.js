/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.mjs",
	experiments: {
		outputModule: true,
		css: true
	},
	name: "esm",
	target: "web",
	output: {
		publicPath: "",
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].mjs",
		chunkFormat: "module",
		crossOriginLoading: "anonymous"
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
