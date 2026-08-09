"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	optimization: {
		// so `libIdent` — the third identifier form — shows up as the module id
		moduleIds: "named"
	},
	plugins: [
		// leaves one glob entry without a module, so the sync source has to fall
		// back to the user request
		new webpack.IgnorePlugin({
			resourceRegExp: /^\.\/two\.js$/,
			contextRegExp: /named$/
		})
	]
};
