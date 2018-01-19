var path = require("path");

module.exports = {
	// mode: "development" || "production",
	entry: {
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	optimization: {
		splitChunks: {
			chunks: "initial",
			minSize: 0, // This is example is too small to create commons chunks
			name: "common",
			cacheGroups: {
				vendor: {
					test: /node_modules/,
					name: "vendor",
					enforce: true
				}
			}
		}
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	}
};
