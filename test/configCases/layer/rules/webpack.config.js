/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: {
			import: "./index.js",
			layer: "entry-layer"
		}
	},
	output: {
		pathinfo: "verbose"
	},
	module: {
		rules: [
			{
				test: /module-layer-change/,
				layer: "layer"
			},
			{
				test: /module-other-layer-change/,
				layer: "other-layer"
			},
			{
				test: /module\.js$/,
				issuerLayer: "other-layer",
				loader: "./loader.js",
				options: {
					value: "other"
				}
			},
			{
				test: /module\.js$/,
				issuerLayer: "layer",
				loader: "./loader.js",
				options: {
					value: "ok"
				}
			},
			{
				test: /module\.js$/,
				issuerLayer: "entry-layer",
				loader: "./loader.js",
				options: {
					value: "entry"
				}
			}
		]
	},
	experiments: {
		layers: true
	},
	externals: [
		{
			external1: "var 42",
			byLayer: {
				layer: {
					external1: "var 43"
				}
			}
		},
		{
			external2: "var 42",
			byLayer: layer => {
				if (layer === "layer") {
					return {
						external2: "var 43"
					};
				}
			}
		}
	]
};
