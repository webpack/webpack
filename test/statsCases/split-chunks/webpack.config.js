const path = require("path");
const stats = {
	hash: false,
	timings: false,
	assets: false,
	chunks: true,
	chunkOrigins: true,
	entrypoints: true,
	modules: false
};
module.exports = [
	{
		name: "default",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "default/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0 // enforce all
			}
		},
		stats
	},
	{
		name: "all-chunks",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "default/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0, // enforce all,
				chunks: "all"
			}
		},
		stats
	}
];
