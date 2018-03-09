const SplitChunksPlugin = require("../../../../lib/optimize/SplitChunksPlugin");

module.exports = {
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
		jsonpFunction: "_load_chunk"
	},
	optimization: {
		splitChunks: {
			chunkFilenameDelimiter: "-"
		}
	},
	plugins: [new SplitChunksPlugin()]
};
