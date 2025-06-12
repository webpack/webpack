/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].js"
	},
	optimization: {
		minimize: false,
		runtimeChunk: "single"
	}
};
