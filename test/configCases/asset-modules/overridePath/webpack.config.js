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
				type: "asset"
			},
			{
				test: /\.html$/,
				type: "asset/resource",
				generator: {
					filename: "static/index.html"
				}
			}
		]
	}
};
