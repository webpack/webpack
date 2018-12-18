"use strict";

const IgnorePlugin = require("../../../../lib/IgnorePlugin");

module.exports = {
	entry: "./test.js",
	plugins: [
		new IgnorePlugin({
			checkResource(resource) {
				return /ignored-module/.test(resource);
			},
			checkContext(context) {
				return /folder-b/.test(context);
			}
		})
	]
};
