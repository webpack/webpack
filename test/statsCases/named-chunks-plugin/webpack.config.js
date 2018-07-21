var CommonsChunkPlugin = require("../../../lib/optimize/CommonsChunkPlugin");
var NamedChunksPlugin = require("../../../lib/NamedChunksPlugin");
var NamedModulesPlugin = require("../../../lib/NamedModulesPlugin");

module.exports = {
	entry: {
		"entry": "./entry",
		"vendor": ["./modules/a", "./modules/b"],
	},
	plugins: [
		new CommonsChunkPlugin({
			names: ["vendor", "manifest"],
			minChunks: Infinity
		}),
		new NamedChunksPlugin(),
		new NamedModulesPlugin(),
	]
};
