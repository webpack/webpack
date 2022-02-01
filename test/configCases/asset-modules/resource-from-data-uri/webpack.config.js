/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "media/[name].[contenthash:8][ext]",
		publicPath: "public/"
	},
	module: {
		rules: [
			{
				mimetype: "image/svg+xml",
				type: "asset/resource"
			}
		]
	},
	target: "web"
};
