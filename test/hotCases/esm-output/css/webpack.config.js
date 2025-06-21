/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		outputModule: true,
		css: true
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].js",
		cssFilename: "[name].css"
	},
	optimization: {
		minimize: false
	}
};
