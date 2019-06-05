module.exports = {
	mode: "development",
	output: {
		urlModuleFilename: "images/file[ext]"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				loader: "file-loader",
				options: {
					name: "file-loader.[ext]"
				}
			}
		]
	}
};
