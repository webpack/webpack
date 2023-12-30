const webpack = require("webpack");
const css = require("./css-preset-webpack");

module.exports = () => {
	return {
		presets: [css()],
		optimization: {
			// get readable names in production too
			chunkIds: "named",
			moduleIds: "named",
			// enable some optimizations in dev mode too for showcasing
			sideEffects: true,
			usedExports: true
		},
		plugins: [
			new webpack.DefinePlugin({
				"PRESET_VAR": "\"preset-var\""
			})
		]
	};
};
