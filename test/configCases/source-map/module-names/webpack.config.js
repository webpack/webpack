/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		chunkFilename: "[name].js",
		devtoolModuleFilenameTemplate: "module",
		devtoolFallbackModuleFilenameTemplate: "fallback"
	},
	devtool: "source-map"
};
