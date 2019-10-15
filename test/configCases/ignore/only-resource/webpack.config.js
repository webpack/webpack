"use strict";

const IgnorePlugin = require("../../../../").IgnorePlugin;

module.exports = {
	entry: "./test.js",
	plugins: [
		new IgnorePlugin({
			resourceRegExp: /ignored-module/
		})
	]
};
