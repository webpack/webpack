/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: {
			import: "./index.js",
			library: { type: "module" }
		}
	},
	output: {
		filename: "[name].mjs"
	},
	optimization: {
		runtimeChunk: "single"
	},
	experiments: {
		outputModule: true
	},
	mode: "development",
	devtool: false
};
