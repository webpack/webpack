/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	cache: {
		type: "memory"
	},
	optimization: {
		sideEffects: false,
		providedExports: false
	},
	module: {
		rules: [
			{
				test: /other-layer/,
				layer: "other-layer"
			}
		]
	},
	experiments: {
		cacheUnaffected: true,
		layers: true
	}
};
