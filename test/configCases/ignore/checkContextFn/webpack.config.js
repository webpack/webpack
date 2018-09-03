"use strict";

const IgnorePlugin = require("../../../../lib/IgnorePlugin");

module.exports = {
	entry: "./test.js",
	plugins: [
		new IgnorePlugin({
			checkResource: function(resource) {
				return /ignored-module/.test(resource);
			},
			checkContext: function(context) {
				return /folder-b/.test(context);
			}
		})
	]
};
