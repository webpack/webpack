/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: "./a",
		bundle1: "./b"
	},
	optimization: {
		flagIncludedChunks: false,
		chunkIds: "named"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[id].[chunkhash].js"
	}
};
