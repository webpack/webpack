const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index",
	optimization: {
		splitChunks: {
			cacheGroups: {
				x: {
					test: path.resolve(__dirname, "x"),
					name: "x",
					priority: 2,
					enforce: true
				},
				y: {
					test: path.resolve(__dirname, "y"),
					priority: 1,
					name: "y",
					enforce: true,
					reuseExistingChunk: true
				}
			}
		}
	}
};
