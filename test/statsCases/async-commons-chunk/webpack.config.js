/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./",
	optimization: {
		splitChunks: {
			minSize: 0
		}
	},
	stats: {
		hash: false,
		timings: false,
		builtAt: false,
		assets: false,
		chunks: true,
		chunkRelations: true,
		chunkOrigins: true,
		modules: false
	}
};
