/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	cache: {
		type: "memory"
	},
	optimization: {
		sideEffects: false
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
		layers: true
	}
};
