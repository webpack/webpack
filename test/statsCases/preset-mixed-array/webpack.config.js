module.exports = [
	{
		name: "minimal",
		mode: "production",
		optimization: { moduleIds: "natural", chunkIds: "natural" },
		entry: "./index",
		stats: "minimal"
	},

	{
		name: "none",
		mode: "production",
		optimization: { moduleIds: "natural", chunkIds: "natural" },
		entry: "./index",
		stats: false
	},

	{
		name: "verbose",
		mode: "production",
		optimization: { moduleIds: "natural", chunkIds: "natural" },
		entry: "./index",
		stats: {
			entrypoints: true,
			hash: false,
			timings: false,
			builtAt: false,
			chunks: false,
			assets: false
		}
	}
];
