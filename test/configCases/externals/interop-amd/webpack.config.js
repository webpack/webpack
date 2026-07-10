"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		libraryTarget: "amd"
	},
	module: {
		rules: [{ test: /index\.js$/, type: "javascript/esm" }]
	},
	externals: {
		"esm-ext": { amd: "esm-ext", interop: "esModule" },
		"cjs-ext": { amd: "cjs-ext", interop: "default" },
		"plain-ext": "plain-ext"
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner:
				"function define(deps, fn) { fn(...deps.map(dep => require(dep))); }\n"
		})
	]
};
