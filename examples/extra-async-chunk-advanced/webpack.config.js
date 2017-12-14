var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");

module.exports = {
	// mode: "development || "production",
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
	],
	optimization: {
		occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
	}
};
