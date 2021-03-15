/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		assetModulePublicPath: "/assets/",
		assetModuleFilename: "file[ext]"
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
