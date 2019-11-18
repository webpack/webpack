module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(png|svg)$/,
				type: "asset",
				generator: {
					dataUrl: {
						maxSize: Infinity
					}
				}
			},
			{
				test: /\.jpg$/,
				type: "asset",
				generator: {
					dataUrl: {
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
