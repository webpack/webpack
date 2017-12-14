var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
var outputOptions = {
	path: path.join(__dirname, "js"),
	filename: "[name].bundle.js",
	chunkFilename: "[id].chunk.js"
};
module.exports = [{
	name: "page",
	// mode: "development || "production",
	entry: {
		page: "./page"
	},
	output: outputOptions,
	optimization: {
		occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
	}
}, {
	name: "pageA",
	// mode: "development || "production",
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
	],
	optimization: {
		occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
	}
}, {
	name: "pageB",
	// mode: "development || "production",
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
	],
	optimization: {
		occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
	}
}, {
	name: "pageC",
	// mode: "development || "production",
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
	],
	optimization: {
		occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
	}
}];
