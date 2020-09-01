var webpack = require("../../../");
/** @type {import("../../../").Configuration[]} */
module.exports = [1, 2, 3, 4].map(n => ({
	name: `${n} chunks`,
	mode: "production",
	entry: "./index",
	output: {
		filename: `bundle${n}.js`
	},
	plugins: [
		new webpack.optimize.LimitChunkCountPlugin({
			maxChunks: n
		})
	],
	stats: {
		chunkModules: true,
		dependentModules: true,
		chunkRelations: true,
		modules: false,
		chunks: true
	}
}));
