module.exports = {
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	stats: {
		chunkModules: false,
		modules: true,
		providedExports: true,
		usedExports: true
	}
};
