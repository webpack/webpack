"use strict";

const path = require("path");
const webpack = require("../../../../");

/**
 * @param {boolean} emptyDefaultRules whether `module.defaultRules` is emptied
 * @returns {import("../../../../").Configuration} configuration
 */
const config = (emptyDefaultRules) => ({
	mode: "development",
	target: "node",
	output: {
		filename: emptyDefaultRules ? "no-default-rules/bundle.js" : "bundle0.js",
		assetModuleFilename: emptyDefaultRules
			? "no-default-rules/[name][ext]"
			: "[name][ext]"
	},
	module: {
		defaultRules: emptyDefaultRules ? [] : ["..."],
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
	plugins: [
		new webpack.DefinePlugin({
			EMPTY_DEFAULT_RULES: JSON.stringify(emptyDefaultRules)
		})
	]
});

module.exports = [config(false), config(true)];
