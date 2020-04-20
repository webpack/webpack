/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a",
		b: "./b"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			chunks: "initial",
			cacheGroups: {
				a: {
					test: /vendor-a/,
					name: "vendor-a",
					enforce: true,
					priority: 1
				},
				b: {
					test: /vendor/,
					name: "vendor-b",
					enforce: true
				}
			}
		},
		runtimeChunk: "single"
	}
};
