var NamedChunksPlugin = require("../../../lib/NamedChunksPlugin");
var NamedModulesPlugin = require("../../../lib/NamedModulesPlugin");

module.exports = {
	mode: "production",
	entry: {
		entry: "./entry"
	},
	optimization: {
		moduleIds: "natural",
		chunkIds: "natural",
		splitChunks: {
			cacheGroups: {
				vendor: {
					name: "vendor",
					test: /modules[\\/][ab]/,
					chunks: "all",
					enforce: true
				}
			}
		}
	},
	plugins: [new NamedChunksPlugin(), new NamedModulesPlugin()]
};
