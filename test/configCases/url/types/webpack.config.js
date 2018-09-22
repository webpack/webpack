module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "url/experimental"
			},
			{
				test: /\.svg$/,
				type: "url/experimental"
			}
		]
	}
};
