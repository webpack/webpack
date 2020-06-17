/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		libraryTarget: "commonjs2"
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
