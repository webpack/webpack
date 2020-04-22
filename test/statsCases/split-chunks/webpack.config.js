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
/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		name: "default",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "default/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0 // enforce all
			}
		},
		stats
	},

	{
		name: "all-chunks",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "all-chunks/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0, // enforce all,
				chunks: "all"
			}
		},
		stats
	},

	{
		name: "manual",
		mode: "production",
		entry: {
			main: "./",
			a: ["x", "y", "z", "./a"],
			b: ["x", "y", "z", "./b"],
			c: ["x", "y", "z", "./c"]
		},
		output: {
			filename: "manual/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0, // enforce all,
				chunks: "all",
				cacheGroups: {
					default: false,
					vendors: {
						test: /[\\/]node_modules[\\/]/,
						name: "vendors",
						enforce: true
					}
				}
			}
		},
		stats
	},
	{
		name: "name-too-long",
		mode: "production",
		entry: {
			main: "./",
			aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: "./a",
			bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb: "./b",
			cccccccccccccccccccccccccccccc: "./c"
		},
		output: {
			filename: "name-too-long/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0,
				maxInitialRequests: Infinity,
				chunks: "all"
			}
		},
		stats
	},

	{
		name: "custom-chunks-filter",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "custom-chunks-filter/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0,
				chunks: chunk => chunk.name !== "a"
			}
		},
		stats
	},

	{
		name: "custom-chunks-filter-in-cache-groups",
		mode: "production",
		entry: {
			main: "./",
			a: ["x", "y", "z", "./a"],
			b: ["x", "y", "z", "./b"],
			c: ["x", "y", "z", "./c"]
		},
		output: {
			filename: "custom-chunks-filter-in-cache-groups/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0,
				chunks: "all",
				cacheGroups: {
					default: false,
					vendors: {
						test: /[\\/]node_modules[\\/]/,
						name: "vendors",
						enforce: true,
						chunks: chunk => chunk.name !== "a"
					}
				}
			}
		},
		stats
	}
];
