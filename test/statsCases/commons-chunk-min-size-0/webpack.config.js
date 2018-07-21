var CommonsChunkPlugin = require("../../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		"entry-1": "./entry-1",
		"vendor-1": ["./modules/a", "./modules/b", "./modules/c"],
	},
	plugins: [
		new CommonsChunkPlugin({
			name: "vendor-1",
			minChunks: 1,
			minSize: 0,
		}),
	]
};
