"use strict";

const path = require("path");
const webpack = require("../../../../");

/**
 * @param {boolean} futureDefaults whether to enable `experiments.futureDefaults`
 * @returns {import("../../../../").Configuration} configuration
 */
const config = (futureDefaults) => ({
	mode: "development",
	target: "node",
	output: {
		filename: futureDefaults ? "future/bundle.mjs" : "bundle.js",
		assetModuleFilename: futureDefaults ? "future/[name][ext]" : "[name][ext]"
	},
	module: {
		rules: [
			{ test: /\.js$/, type: "javascript/auto" },
			{ mimetype: "text/javascript", type: "javascript/auto" },
			{
				test: /\.png$/,
				type: "javascript/auto",
				use: path.resolve(__dirname, "url-loader.js")
			}
		]
	},
	experiments: { futureDefaults },
	plugins: [
		new webpack.DefinePlugin({
			FUTURE_DEFAULTS: JSON.stringify(futureDefaults)
		})
	]
});

module.exports = [config(false), config(true)];
