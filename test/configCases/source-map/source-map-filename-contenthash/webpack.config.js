module.exports = {
	mode: "development",
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map",
	output: {
		sourceMapFilename: "[file]-[contenthash].map?[contenthash]-[contenthash]"
	}
};
