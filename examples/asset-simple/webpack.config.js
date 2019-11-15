module.exports = {
	output: {
		assetModuleFilename: "images/[hash][ext]"
	},
	module: {
		rules: [
			{
				test: /\.(png|jpg|svg)$/,
				type: "asset",
				generator: {
					foo: "bar"
				}
			}
		]
	},
	experiments: {
		asset: true
	}
};
