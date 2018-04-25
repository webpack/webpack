const MinChunkSizePlugin = require("../../../lib/optimize/MinChunkSizePlugin");

module.exports = {
	mode: "production",
	target: "web",
	entry: {
		main1: "./main1"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: {
			name: "manifest"
		}
	},
	stats: {
		hash: false,
		timings: false,
		builtAt: false,
		reasons: false
	},
	plugins: [
		new MinChunkSizePlugin({
			minChunkSize: 1000
		})
	]
};
