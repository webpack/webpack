module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(png|svg)$/,
				type: "asset/inline"
			},
			{
				test: /\.jpg$/,
				type: "asset",
				parser: {
					dataUrlCondition: {
						maxSize: Infinity
					}
				}
			}
		]
	},
	experiments: {
		asset: true
	}
};
