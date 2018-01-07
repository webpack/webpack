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
		initialVendorChunk: "libs"
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
