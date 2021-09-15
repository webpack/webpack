/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		name: "minimal",
		mode: "production",
		entry: "./index",
		output: {
			filename: "minimal.js"
		},
		stats: "minimal"
	},

	{
		name: "none",
		mode: "production",
		entry: "./index",
		output: {
			filename: "none.js"
		},
		stats: false
	},

	{
		name: "verbose",
		mode: "production",
		entry: "./index",
		output: {
			filename: "verbose.js"
		},
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
