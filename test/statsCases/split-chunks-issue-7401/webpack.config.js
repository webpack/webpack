const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: false,
	chunks: true,
	chunkOrigins: true,
	entrypoints: true,
	chunkGroups: true,
	modules: false
};
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
		moduleIds: "natural",
		chunkIds: "natural",
		splitChunks: {
			minSize: 0, // enforce all
			chunks: "all"
		}
	},
	stats
};
