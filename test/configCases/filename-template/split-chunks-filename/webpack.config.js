module.exports = {
	mode: "development",
	node: {
		__dirname: false,
		__filename: false
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /node_modules/,
					chunks: "initial",
					filename: "vendor.js",
					enforce: true
				}
			}
		}
	}
};
