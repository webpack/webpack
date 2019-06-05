module.exports = {
	mode: "development",
	output: {
		publicPath: "assets/",
		urlModuleFilename: "file[ext]"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "url/experimental"
			}
		]
	}
};
