/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		publicPath: "assets/",
		assetModuleFilename: "file[ext]",
		environment: {
			templateLiteral: true
		}
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset"
			}
		]
	}
};
