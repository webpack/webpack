/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		chunkFilename: "chunk-[name].js",
		workerChunkFilename: "worker-[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
