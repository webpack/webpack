var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
var outputOptions = {
	path: path.join(__dirname, "js"),
	filename: "[name].bundle.js",
	chunkFilename: "[id].chunk.js"
};
module.exports = [{
	name: "page",
	entry: {
		page: "./page"
	},
	output: outputOptions
}, {
	name: "pageA",
	entry: {
		pageA: "./page"
	},
	output: outputOptions,
	plugins: [
		//check for common modules in children of pageA and move them to the parent
		new CommonsChunkPlugin({
			name: "pageA",
			children: true
		}),
	]
}, {
	name: "pageB",
	entry: {
		pageB: "./page"
	},
	output: outputOptions,
	plugins: [
		// the same for pageB but move them if at least 3 children share the module
		new CommonsChunkPlugin({
			name: "pageB",
			children: true,
			minChunks: 3
		}),
	]
}, {
	name: "pageC",
	entry: {
		pageC: "./page"
	},
	output: outputOptions,
	plugins: [
		// the same for pageC and pageD but with a custom logic for moving
		new CommonsChunkPlugin({
			name: "pageC",
			children: true,
			minChunks: function(module, count) {
				// move only module "b"
				return !/b\.js/.test(module.identifier());
			}
		})
	]
}];
