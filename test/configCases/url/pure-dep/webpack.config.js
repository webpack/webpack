/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[path][name][ext]"
	},
	optimization: {
		minimize: false,
		innerGraph: true
	},
	module: {
		parser: {
			javascript: {
				dynamicUrl: true
			}
		}
	}
};
