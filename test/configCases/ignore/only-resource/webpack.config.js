"use strict";

const IgnorePlugin = require("../../../../").IgnorePlugin;

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./test.js",
	plugins: [
		new IgnorePlugin({
			resourceRegExp: /ignored-module/
		})
	]
};
