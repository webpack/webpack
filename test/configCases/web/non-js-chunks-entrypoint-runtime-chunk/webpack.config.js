const { ProvideSharedPlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	target: "web",
	optimization: {
		chunkIds: "named",
		runtimeChunk: "single",
		splitChunks: {
			chunks: "all",
			minSize: 1,
			cacheGroups: {
				share: {
					type: "provide-module",
					name: "provide-module",
					enforce: true
				}
			}
		}
	},
	plugins: [
		new ProvideSharedPlugin({
			provides: ["package"]
		})
	]
};
