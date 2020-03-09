"use strict";

const { IgnorePlugin } = require("../../../../");

module.exports = {
	entry: "./test.js",
	plugins: [
		new IgnorePlugin({
			resourceRegExp: /ignored-module/
		})
	]
};
