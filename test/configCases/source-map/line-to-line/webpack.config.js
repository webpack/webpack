module.exports = {
	mode: "development",
	output: {
		devtoolLineToLine: true
	},
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "cheap-source-map"
};
