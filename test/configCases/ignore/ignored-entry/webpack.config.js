"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: "./index",
		bundle1: "./ignored-entry"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new webpack.IgnorePlugin({
			resourceRegExp: /ignored-entry/
		})
	]
};
