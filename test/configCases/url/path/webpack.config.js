module.exports = {
	mode: "development",
	output: {
		urlModuleFilename: "images/file[ext]"
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
