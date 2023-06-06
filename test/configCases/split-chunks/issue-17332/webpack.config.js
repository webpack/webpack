/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		main: "./index"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js",
		chunkLoadingGlobal: "_load_chunk"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				async: {
					chunks: /bar/,
					test: /bar\.js/,
					name: "bar",
					minSize: 1
				}
			}
		}
	}
};
