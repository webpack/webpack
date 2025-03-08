/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		assetModuleFilename: "[name][ext][query][fragment]",
		publicPath: "public/"
	},
	module: {
		parser: {
			javascript: {
				url: "relative"
			}
		}
	}
};
