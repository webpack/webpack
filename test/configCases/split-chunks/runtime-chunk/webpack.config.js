const path = require("path");

module.exports = {
	entry: {
		a: "./a",
		b: "./b"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				dep: {
					chunks: "all",
					test: path.resolve(__dirname, "shared.js"),
					enforce: true
				}
			}
		}
	}
};
