const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: false,
	chunks: true,
	chunkRelations: true,
	chunkOrigins: true,
	entrypoints: true,
	chunkGroups: true,
	modules: false
};
/** @type {import("../../../").Configuration} */
module.exports = {
	name: "default",
	mode: "production",
	entry: {
		a: "./a",
		b: "./b"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			minSize: 0, // enforce all
			chunks: "all"
		}
	},
	stats
};
