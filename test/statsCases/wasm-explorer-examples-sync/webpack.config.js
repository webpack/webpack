/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	optimization: {
		splitChunks: {
			minSize: {},
			maxSize: {
				webassembly: 500
			}
		}
	},
	stats: {
		chunks: true,
		chunkModules: true,
		dependentModules: true,
		modules: true
	},
	experiments: {
		asyncWebAssembly: true
	}
};
