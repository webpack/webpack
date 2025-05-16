/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		assetModuleFilename: "[name][ext][query][fragment]"
	},
	module: {
		parser: {
			javascript: {
				url: "relative"
			}
		}
	}
};
