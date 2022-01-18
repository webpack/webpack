/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: {
		css: true
	},
	output: {
		assetModuleFilename: "[name].[hash][ext][query][fragment]"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				assetFixHack: {
					type: "asset/resource",
					chunks: "all",
					name: "main",
					enforce: true
				}
			}
		}
	}
};
