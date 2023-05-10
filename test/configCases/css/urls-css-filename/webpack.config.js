/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: {
		css: true
	},
	output: {
		cssFilename: "css/[name].css",
		cssChunkFilename: "css/async/[name].css",
		assetModuleFilename: "asset/[name].[hash][ext][query][fragment]"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				assetFixHack: {
					type: "asset/resource",
					chunks: "all",
					name: "main",
					enforce: true
				},
				assetFixHack1: {
					type: "asset/inline",
					chunks: "all",
					name: "main",
					enforce: true
				}
			}
		}
	}
};
