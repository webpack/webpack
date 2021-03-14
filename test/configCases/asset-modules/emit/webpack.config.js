/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		assetModuleFilename: "images/file[ext]"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset",
				generator: {
					emit: false
				}
			}
		]
	}
};
