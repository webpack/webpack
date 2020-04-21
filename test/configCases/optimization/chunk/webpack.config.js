const webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		chunkIds: false
	},
	plugins: [new webpack.ids.DeterministicChunkIdsPlugin()]
};
