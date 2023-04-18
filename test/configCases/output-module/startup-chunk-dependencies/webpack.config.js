/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		outputModule: true
	},
	target: "es2020",
	optimization: {
		splitChunks: {
			cacheGroups: {
				commons: {
					test: /\.common/,
					minSize: 0,
					chunks: "all"
				}
			}
		}
	}
};
