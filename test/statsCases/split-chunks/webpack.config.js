const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: false,
	chunks: true,
	chunkOrigins: true,
	entrypoints: true,
	modules: false
};
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
			moduleIds: "natural",
			chunkIds: "natural",
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
			filename: "default/[name].js"
		},
		optimization: {
			moduleIds: "natural",
			chunkIds: "natural",
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
			a: "./a",
			b: "./b",
			c: "./c",
			vendors: ["x", "y", "z"]
		},
		output: {
			filename: "default/[name].js"
		},
		optimization: {
			moduleIds: "natural",
			chunkIds: "natural",
			splitChunks: {
				minSize: 0, // enforce all,
				chunks: "all",
				cacheGroups: {
					default: false,
					vendors: {
						test: "vendors",
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
			filename: "[name].js"
		},
		optimization: {
			moduleIds: "natural",
			chunkIds: "natural",
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
			filename: "default/[name].js"
		},
		optimization: {
			moduleIds: "natural",
			chunkIds: "natural",
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
			a: "./a",
			b: "./b",
			c: "./c",
			vendors: ["x", "y", "z"]
		},
		output: {
			filename: "default/[name].js"
		},
		optimization: {
			moduleIds: "natural",
			chunkIds: "natural",
			splitChunks: {
				minSize: 0,
				chunks: "all",
				cacheGroups: {
					default: false,
					vendors: {
						test: "vendors",
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
