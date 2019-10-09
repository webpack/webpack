"use strict";

const IgnorePlugin = require("../../../../").IgnorePlugin;

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
