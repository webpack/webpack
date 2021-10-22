/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: "manifest",
	optimization: {
		splitChunks: {
			chunks: "async",
			cacheGroups: {
				pack: {
					reuseExistingChunk: false,
					test: /pack/
				},
				vendor: {
					reuseExistingChunk: false,
					test: /vendor/
				}
			}
		}
	}
};
