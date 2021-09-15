/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index.js",
	optimization: {
		splitChunks: false
	},
	stats: {
		all: false,
		chunks: true,
		chunkModules: true,
		dependentModules: false
	}
};
