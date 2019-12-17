module.exports = {
	mode: "none",
	entry: {
		a: "./a",
		"inner-dir/b": "./inner-dir/b"
	},
	target: "node",
	output: {
		libraryTarget: "commonjs2",
		pathinfo: true,
		filename: "[name].js",
		chunkFilename: "[name].chunk.min.js"
	},
	optimization: {
		minimize: false,
		concatenateModules: false,
		splitChunks: {
			cacheGroups: {
				commons: {
					name: "commons",
					chunks: "all",
					maxSize: 512000,
					minChunks: 2
				}
			}
		}
	}
};
