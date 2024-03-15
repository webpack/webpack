/** @type {import("../../../../").Configuration} */
const common = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: {
		css: true
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

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		...common,
		output: {
			publicPath: "auto",
			cssFilename: "bundle0/css/[name].css",
			assetModuleFilename: "bundle0/asset/[name][ext]"
		}
	},
	{
		...common,
		output: {
			publicPath: "https://test.cases/path/",
			cssFilename: "bundle1/css/[name].css",
			assetModuleFilename: "bundle1/asset/[name][ext]"
		}
	}
];
