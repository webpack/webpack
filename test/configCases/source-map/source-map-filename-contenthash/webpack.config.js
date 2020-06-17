/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: "source-map",
	output: {
		sourceMapFilename: "[file]-[contenthash].map?[contenthash]-[contenthash]"
	}
};
