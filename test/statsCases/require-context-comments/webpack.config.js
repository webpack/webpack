/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		chunkFilename: "[name].js"
	},
	stats: {
		timings: false,
		hash: false,
		entrypoints: false,
		assets: false,
		errorDetails: false,
		moduleTrace: true
	}
};
