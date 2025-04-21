module.exports = {
	entry: {
		lib: "./lib.js",
		main: { import: "./main.js", dependOn: ["lib"] }
	},
	optimization: {
		runtimeChunk: "single",
		splitChunks: {
			chunks: "all"
		}
	},
	target: "node",
	output: {
		filename: "[name].[contenthash].js"
	}
};
