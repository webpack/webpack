/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		main: "./index.js"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].bundle.js"
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			name: "common",
			maxSize: 2,
			minSize: 1
		}
	}
};
