/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: {
		css: true
	},
	output: {
		assetModuleFilename: "[name].[hash][ext][query][fragment]"
	}
};
