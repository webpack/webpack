/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a",
		b: "./b"
	},
	output: {
		filename: data => `${data.chunk.name || data.chunk.id}.js`,
		libraryTarget: "commonjs2"
	},
	optimization: {
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				shared: {
					chunks: "all",
					test: /shared/,
					filename: data => `shared-${data.chunk.name || data.chunk.id}.js`,
					enforce: true
				},
				common: {
					chunks: "all",
					test: /common/,
					enforce: true
				}
			}
		}
	}
};
