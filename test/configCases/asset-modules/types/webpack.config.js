module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(png|svg)$/,
				type: "asset"
			},
			{
				test: /\.jpg$/,
				type: "asset"
			}
		]
	},
	experiments: {
		asset: true
	}
};
