/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
	},
	devtool: false,
	optimization: {
		minimize: false,
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				testModule1: {
					test: /testModule1/,
					name: "testModule1",
					priority: 10,
					enforce: true
				},
				testModule2: {
					test: /testModule2/,
					name: "testModule2",
					priority: 20
				}
			}
		}
	}
};
