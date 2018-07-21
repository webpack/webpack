module.exports = [
	{
		name: "minimal",
		entry: "./index",
		stats: "minimal"
	},
	{
		name: "none",
		entry: "./index",
		stats: false
	},
	{
		name: "verbose",
		entry: "./index",
		stats: {
			entrypoints: true,
			hash: false,
			timings: false,
			chunks: false,
			assets: false
		}
	}
];
