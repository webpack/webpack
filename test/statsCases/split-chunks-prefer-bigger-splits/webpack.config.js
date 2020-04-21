const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: false,
	chunks: true,
	chunkRelations: true,
	chunkOrigins: true,
	entrypoints: true,
	modules: false
};
/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		main: "./"
	},
	output: {
		filename: "default/[name].js"
	},
	optimization: {
		splitChunks: {
			minSize: 80,
			minRemainingSize: 0
		}
	},
	stats
};
