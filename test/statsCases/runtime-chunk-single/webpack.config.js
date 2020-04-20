/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		e1: "./e1",
		e2: "./e2"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	stats: {
		hash: false,
		timings: false,
		builtAt: false,
		assets: false,
		modules: false,
		reasons: true
	},
	optimization: {
		runtimeChunk: "single"
	}
};
