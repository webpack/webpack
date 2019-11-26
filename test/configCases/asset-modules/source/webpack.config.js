module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.svg$/,
				type: "asset/source"
			}
		]
	},
	experiments: {
		asset: true
	}
};
