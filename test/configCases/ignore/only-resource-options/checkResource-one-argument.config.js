"use strict";

const IgnorePlugin = require("../../../../").IgnorePlugin;

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./test.js",
	plugins: [
		new IgnorePlugin({
			checkResource(resource) {
				return /ignored-module/.test(resource);
			}
		})
	]
};
