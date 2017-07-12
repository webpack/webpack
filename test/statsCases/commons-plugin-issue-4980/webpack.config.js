var CommonsChunkPlugin = require("../../../lib/optimize/CommonsChunkPlugin");
var NamedModulesPlugin = require("../../../lib/NamedModulesPlugin");

// should generate vendor chunk with the same chunkhash for both entries
module.exports = [{
	entry: {
		app: "./entry-1.js"
	},
	plugins: [
		new NamedModulesPlugin(),
		new CommonsChunkPlugin({
			name: "vendor",
			filename: "[name].[chunkhash].js",
			minChunks: m => /constants/.test(m.resource)
		}),
		new CommonsChunkPlugin({
			name: "runtime"
		})
	]
},{
	entry: {
		app: "./entry-2.js"
	},
	plugins: [
		new NamedModulesPlugin(),
		new CommonsChunkPlugin({
			name: "vendor",
			filename: "[name].[chunkhash].js",
			minChunks: m => /constants/.test(m.resource)
		}),
		new CommonsChunkPlugin({
			name: "runtime"
		})
	]
}];
