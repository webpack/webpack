const webpack = require("webpack");

module.exports = () => {
	return {
		plugins: [
			new webpack.DefinePlugin({
				"PRESET_VAR": "\"preset-var\""
			})
		]
	};
};
