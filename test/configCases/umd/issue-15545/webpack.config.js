/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		main: "./index.js"
	},
	output: {
		filename: "[name].js",
		library: "MyLibrary",
		libraryTarget: "umd",
		chunkLoading: "jsonp",
		chunkFormat: "array-push",
		globalObject: "globalThis"
	},
	optimization: {
		minimize: false,
		runtimeChunk: "single"
	}
};
