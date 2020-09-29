/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: {
		assets: true,
		chunkGroups: true,
		chunkGroupAuxiliary: true,
		chunks: true,
		chunkModules: true,
		dependentModules: true,
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
