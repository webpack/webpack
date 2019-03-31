module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(png|svg)$/,
				type: "url/experimental"
			},
			{
				test: /\.jpg$/,
				type: "url/experimental"
			}
		]
	}
};
