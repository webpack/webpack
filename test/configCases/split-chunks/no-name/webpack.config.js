/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				common: {
					name: () => {},
					test: /a\.js/,
					chunks: "all",
					enforce: true
				}
			}
		}
	}
};
