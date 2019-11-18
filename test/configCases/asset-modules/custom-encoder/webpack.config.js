module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(png|jpg)$/,
				type: "asset",
				generator: {
					dataUrl: false
				}
			},
			{
				test: /\.svg$/,
				type: "asset",
				generator: {
					dataUrl() {
						return "data:image/svg+xml;base64,custom-content";
					}
				}
			}
		]
	},
	experiments: {
		asset: true
	}
};
