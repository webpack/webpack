/** @type {import("../../../../").Configuration} */
module.exports = {
	performance: {
		hints: false
	},
	optimization: {
		splitChunks: {
			minSize: 1
		},
		chunkIds: "named"
	}
};
