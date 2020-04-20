/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a",
		b: "./b"
	},
	output: {
		filename: "[name].js",
		libraryTarget: "commonjs2"
	},
	optimization: {
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				shared: {
					chunks: "all",
					test: /shared/,
					filename: "shared-[name].js",
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
