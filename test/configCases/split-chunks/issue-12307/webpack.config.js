/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: "./index",
		a: "./a",
		b: "./b"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		chunkIds: "named",
		sideEffects: false,
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				test: {
					test: /shared/,
					minChunks: 1,
					chunks: "initial",
					minSize: 100
				}
			}
		}
	}
};
