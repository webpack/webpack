"use strict";

const path = require("path");
const webpack = require("../../../../");

const jsRule = { test: /\.js$/, type: "javascript/auto" };
const dataJsRule = { mimetype: "text/javascript", type: "javascript/auto" };
// the documented way to keep a loader producing the module instead of an asset module
const loaderRule = {
	test: /\.png$/,
	type: "javascript/auto",
	use: path.resolve(__dirname, "url-loader.js")
};

/**
 * @param {string} name case name, also the output subdirectory
 * @param {import("../../../../").RuleSetRule[]} rules user `module.rules`
 * @param {boolean=} futureDefaults whether to enable `experiments.futureDefaults`
 * @returns {import("../../../../").Configuration} configuration
 */
const config = (name, rules, futureDefaults = false) => ({
	mode: "development",
	target: "node",
	output: {
		filename: `${name}/bundle.${futureDefaults ? "mjs" : "js"}`,
		assetModuleFilename: `${name}/[name][ext]`
	},
	module: { rules },
	experiments: { futureDefaults },
	plugins: [new webpack.DefinePlugin({ CASE: JSON.stringify(name) })]
});

module.exports = [
	config("type-rule", [jsRule, dataJsRule]),
	config("loader-rule", [jsRule, loaderRule]),
	config("url-rule", [jsRule, { dependency: "url", type: "asset/inline" }]),
	config("future", [jsRule, dataJsRule, loaderRule], true)
];
