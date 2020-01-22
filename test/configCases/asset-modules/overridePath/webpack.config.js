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
				type: "asset",
				generator: {
					assetFilename: "static/index.html"
				}
			}
		]
	},
	experiments: {
		asset: true
	}
};
