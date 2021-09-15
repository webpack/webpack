/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	entry: {
		a: "./a?1",
		"inner-dir/b": "./inner-dir/b",
		"inner-dir/deep/deep/c": "./a?2"
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
