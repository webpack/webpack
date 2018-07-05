module.exports = [
	{
		name: "minimal",
		mode: "production",
		entry: "./index",
		stats: "minimal"
	},

	{
		name: "none",
		mode: "production",
		entry: "./index",
		stats: false
	},

	{
		name: "verbose",
		mode: "production",
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
