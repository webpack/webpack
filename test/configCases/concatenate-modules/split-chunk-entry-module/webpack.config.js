module.exports = {
	entry: {
		main: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		concatenateModules: true,
		runtimeChunk: "single",
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				common: {
					chunks: "initial",
					minChunks: 1
				}
			}
		}
	}
};
