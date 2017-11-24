var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");

module.exports = {
	mode: "production",
	plugins: [
		new CommonsChunkPlugin({
			name: "main",
			async: "async1"
		}),
		new CommonsChunkPlugin({
			name: "main",
			async: "async2",
			minChunks: 2
		}),
		new CommonsChunkPlugin({
			async: true
		}),
	]
};
