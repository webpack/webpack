/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle: "./index.js",
		entry: { import: "./entry.js", runtime: "runtime" }
	},
	mode: "production",
	cache: {
		type: "memory"
	},
	output: {
		filename: "[name].js",
		pathinfo: true,
		library: { type: "commonjs-module" }
	},
	optimization: {
		splitChunks: {
			minSize: 1,
			chunks: "all",
			usedExports: false
		},
		minimize: false,
		concatenateModules: false
	}
};
