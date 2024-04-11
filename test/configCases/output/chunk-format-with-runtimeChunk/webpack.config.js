module.exports = {
	mode: "production",
	entry: {
		main: "./index.js"
	},
	optimization: {
		runtimeChunk: "single"
	},
	output: {
		filename: "[name].mjs",
		module: true,
		chunkFormat: "module"
	},
	experiments: {
		outputModule: true
	}
};
