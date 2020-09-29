/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js",
		chunkFilename: "main.[contenthash:8].js"
	},
	optimization: {
		runtimeChunk: "single"
	}
};
