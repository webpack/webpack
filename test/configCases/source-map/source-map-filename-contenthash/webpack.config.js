/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map",
	output: {
		filename: "bundle0.js?[contenthash]",
		sourceMapFilename:
			"[file]-[contenthash].map?[contenthash]-[contenthash:6][query]"
	}
};
