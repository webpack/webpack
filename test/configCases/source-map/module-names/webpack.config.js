/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		chunkFilename: "[name].js",
		devtoolModuleFilenameTemplate: "module",
		devtoolFallbackModuleFilenameTemplate: "fallback"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map"
};
