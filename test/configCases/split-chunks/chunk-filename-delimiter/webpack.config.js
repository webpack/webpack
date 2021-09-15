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
		chunkFilename: "[name].bundle.js",
		chunkLoadingGlobal: "_load_chunk"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				async: {
					chunks: "async",
					automaticNameDelimiter: "---",
					reuseExistingChunk: true,
					minSize: 1,
					maxSize: 1
				}
			}
		}
	}
};
