module.exports = {
	output: {
		lineToLine: true,
		devtoolModuleFilenameTemplate: function(info) {
			return "dummy:///" + info.resourcePath;
		}
	},
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "cheap-source-map"

};
