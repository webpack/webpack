var path = require("path");
var AggressiveMergingPlugin = require("../../lib/optimize/AggressiveMergingPlugin");
module.exports = {
	// mode: "development" || "production",
	entry: {
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].bundle.js",
		chunkFilename: "[id].chunk.js"
	},
	plugins: [
		new AggressiveMergingPlugin({
			minSizeReduce: 1.5
		})
	],
	optimization: {
		occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
	}
};
