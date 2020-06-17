/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		devtoolModuleFilenameTemplate: function (info) {
			return "dummy:///" + info.resourcePath;
		}
	},
	devtool: "cheap-source-map"
};
