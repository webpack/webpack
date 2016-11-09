var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		pageA: "./page?A",
		pageB: "./page?B",
		pageC: "./page?C",
		pageD: "./page?D"
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].bundle.js",
		chunkFilename: "[id].chunk.js"
	},
	plugins: [
		// check for common modules in children of pageA and move them to the parent
		new CommonsChunkPlugin("pageA", null, false),
		
		// the same for pageB but move them if at least 3 children share the module
		new CommonsChunkPlugin("pageB", null, false, 3),
		
		// the same for pageC and pageD but with a custom logic for moving
		new CommonsChunkPlugin(["pageC", "pageD"], null, false, function(module, count) {
			// move only module "b"
			return /b\.js$/.test(module.identifier());
		})
	]
}