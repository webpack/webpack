module.exports = {
	mode: "none",
	entry: "./main.js",
	optimization: {
		usedExports: true,
		sideEffects: true,
		concatenateModules: true
	},
	stats: {
		nestedModules: true,
		usedExports: true,
		reasons: true
	}
};
