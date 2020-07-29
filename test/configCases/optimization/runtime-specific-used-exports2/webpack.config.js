/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	target: "node",
	optimization: {
		chunkIds: "named",
		splitChunks: {
			chunks: "all",
			cacheGroups: {
				defaultVendors: {
					test: /[\\/]node_modules[\\/]/,
					enforce: true
				}
			}
		}
	},
	entry: {
		a: "./1",
		b: "./2",
		c: "./3"
	}
};
