const path = require("path");
module.exports = {
	mode: "production",
	entry: {
		main: "./",
		a: "./a",
		b: "./b",
		c: "./c"
	},
	output: {
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		asyncCommonsChunks: {
			minSize: 1 // enforce all
		},
		initialVendorsChunk: {
			"libs": /[\\/](xyz|x)/,
			vendors: path.resolve(__dirname, "node_modules")
		}
	},
	stats: {
		hash: false,
		timings: false,
		assets: false,
		chunks: true,
		chunkOrigins: true,
		entrypoints: true,
		modules: false
	}
};
