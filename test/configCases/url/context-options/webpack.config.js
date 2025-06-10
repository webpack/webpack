/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[path][name][ext]"
	},
	module: {
		parser: {
			javascript: {
				dynamicUrl: true
			}
		}
	}
};
