const path = require("path");
const AggressiveSplittingPlugin = require("../../lib/optimize/AggressiveSplittingPlugin");
const DefinePlugin = require("../../lib/DefinePlugin");

module.exports = {
	// mode: "development || "production",
	cache: true, // better performance for the AggressiveSplittingPlugin
	entry: "./example",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [
		new AggressiveSplittingPlugin({
			minSize: 30000,
			maxSize: 50000
		}),
		new DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify("production")
		})
	],
	recordsOutputPath: path.join(__dirname, "dist", "records.json")
};
