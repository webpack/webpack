/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "webworker",
	devtool: false,
	output: {
		assetModuleFilename: "[name][ext]"
	},
	experiments: {
		asset: true
	}
};
