/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		"entry-1": "./entry-1"
	},
	optimization: {
		splitChunks: {
			minSize: 0,
			chunks: "all",
			cacheGroups: {
				"vendor-1": /modules[\\/][abc]/
			}
		}
	}
};
