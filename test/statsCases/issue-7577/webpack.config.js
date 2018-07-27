const base = {
	mode: "production",
	optimization: {
		moduleIds: "natural",
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
module.exports = [
	Object.assign(
		{
			entry: "./a.js",
			output: {
				filename: "a-[name]-[chunkhash].js"
			}
		},
		base
	),
	Object.assign(
		{
			entry: "./b.js",
			output: {
				filename: "b-[name]-[chunkhash].js"
			}
		},
		base
	),
	Object.assign(
		{
			entry: "./c.js",
			output: {
				filename: "c-[name]-[chunkhash].js"
			}
		},
		base
	)
];
