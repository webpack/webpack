module.exports = {
	output: {
		urlModuleFilename: "images/[hash][ext]"
	},
	module: {
		rules: [
			{
				test: /\.(png|jpg|svg)$/,
				type: "url/experimental"
			}
		]
	}
};
