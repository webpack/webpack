var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		// The entry points for the pages
		pageA: "./aEntry",
		pageB: "./bEntry",

		// This file contains common modules but also the router entry
		"commons": "./router"
	},
	output: {
		path: path.join(__dirname, "js"),
		publicPath: "js/",
		filename: "[name].bundle.js",
		chunkFilename: "[id].chunk.js"
	},
	plugins: [
		// Extract common modules from the entries to the commons.js file
		// This is optional, but good for performance.
		new CommonsChunkPlugin({
			name: "commons",
			filename: "commons.js"
		})
		// The pages cannot run without the commons.js file now.
	]
};
