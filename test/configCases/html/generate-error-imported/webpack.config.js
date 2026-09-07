"use strict";

// A page imported from JavaScript whose build fails: the module keeps its
// JavaScript side, which re-throws the build error when it is evaluated.

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	module: {
		rules: [
			{
				test: /page\.html$/,
				enforce: "pre",
				loader: path.resolve(__dirname, "error-loader.js")
			}
		]
	},
	optimization: {
		emitOnErrors: true
	},
	bail: false,
	experiments: {
		html: true
	}
};
