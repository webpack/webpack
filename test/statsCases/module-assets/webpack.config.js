module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	stats: {
		assets: false,
		chunks: true,
		chunkModules: true,
		modules: true,
		moduleAssets: true
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				use: [
					{
						loader: "file-loader",
						options: {
							name: "[name].[ext]"
						}
					}
				]
			}
		]
	}
};
