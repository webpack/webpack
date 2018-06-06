var path = require("path");

module.exports = {
	entry: "./index",
	recordsInputPath: path.resolve(__dirname, "records.json"),
	output: {
		chunkFilename: "[name]-[chunkhash].js"
	},
	optimization: {
		splitChunks: {
			minSize: 0
		}
	}
};
