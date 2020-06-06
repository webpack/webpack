/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: {
		assets: true,
		chunkGroups: true,
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
