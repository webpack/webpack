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
			chunks: "all",
			minSize: 0
		}
	}
};
