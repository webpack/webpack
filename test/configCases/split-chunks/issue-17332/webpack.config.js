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
				bar: {
					chunks: /foo/,
					test: /bar\.js/,
					name: "split-foo",
					minSize: 1
				}
			}
		}
	}
};
