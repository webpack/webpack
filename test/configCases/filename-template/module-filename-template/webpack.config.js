/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		devtoolModuleFilenameTemplate(info) {
			return `dummy:///${info.resourcePath}`;
		}
	},
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "cheap-source-map"
};
