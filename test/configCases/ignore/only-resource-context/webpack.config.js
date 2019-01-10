"use strict";

const IgnorePlugin = require("../../../../lib/IgnorePlugin");

module.exports = {
	entry: "./test.js",
	plugins: [
		new IgnorePlugin({
			resourceRegExp: /ignored-module/
		})
	]
};
