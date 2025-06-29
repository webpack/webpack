/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	entry: "./index.js",
	output: {
		chunkFormat: "module",
		workerChunkLoading: "import",
		filename: "bundle.mjs"
	},
	experiments: {
		outputModule: true
	}
};
