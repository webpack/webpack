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
		name: "production",
		mode: "production",
		entry: {
			main: "./"
		},
		output: {
			filename: "prod-[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 100,
				maxSize: 1000,
				chunks: "all"
			}
		},
		stats
	},
	{
		name: "development",
		mode: "development",
		entry: {
			main: "./"
		},
		output: {
			filename: "dev-[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 100,
				maxSize: 1000,
				chunks: "all"
			}
		},
		stats
	},
	{
		name: "switched",
		mode: "production",
		entry: {
			main: "./"
		},
		output: {
			filename: "switched-[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 1000,
				maxSize: 100,
				chunks: "all"
			}
		},
		stats
	},
	{
		name: "zero-min",
		mode: "production",
		entry: {
			main: "./"
		},
		output: {
			filename: "zero-min-[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0,
				maxSize: 1000,
				chunks: "all"
			}
		},
		stats
	},
	{
		name: "max-async-size",
		mode: "production",
		entry: {
			main: "./async"
		},
		output: {
			filename: "max-async-size-[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0,
				maxAsyncSize: 1000,
				chunks: "all"
			}
		},
		stats
	},
	{
		name: "enforce-min-size",
		mode: "production",
		entry: {
			main: "./"
		},
		output: {
			filename: "enforce-min-size-[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 100,
				cacheGroups: {
					all: {
						maxSize: 1000,
						chunks: "all",
						enforce: true
					}
				}
			}
		},
		stats
	}
];
