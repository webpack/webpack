const base = {
	mode: "production",
	optimization: {
		moduleIds: "named",
		chunkIds: "named",
		runtimeChunk: true,
		splitChunks: {
			minSize: 0,
			chunks: "all",
			cacheGroups: {
				all: {
					priority: -30
				}
			}
		}
	}
};
/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		entry: "./a.js",
		output: {
			filename: "a-[name]-[chunkhash].js"
		},
		...base
	},
	{
		entry: "./b.js",
		output: {
			filename: "b-[name]-[chunkhash].js"
		},
		...base
	},
	{
		entry: "./c.js",
		output: {
			filename: "c-[name]-[chunkhash].js"
		},
		...base
	}
];
