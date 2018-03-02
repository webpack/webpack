module.exports = {
	mode: "production",
	entry: "./index",
	stats: {
		chunks: true,
		chunkModules: true,
		modules: true
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				use: ["file-loader"]
			}
		]
	}
};
