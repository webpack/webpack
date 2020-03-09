"use strict";

const { IgnorePlugin } = require("../../../../");

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
