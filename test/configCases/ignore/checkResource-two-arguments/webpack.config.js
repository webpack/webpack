"use strict";

const IgnorePlugin = require("../../../../lib/IgnorePlugin");

module.exports = {
	entry: "./test.js",
	plugins: [
		new IgnorePlugin({
			checkResource(resource, context) {
				return /ignored-module/.test(resource) && /folder-b/.test(context);
			}
		})
	]
};
