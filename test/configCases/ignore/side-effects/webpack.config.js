"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./test.js",
	resolve: {
		alias: {
			"ignored-module": false,
			"./ignored-module": false
		}
	},
	plugins: [new webpack.IgnorePlugin({ resourceRegExp: /(b\.js|b)$/ })],
	optimization: {
		sideEffects: true
	}
};
