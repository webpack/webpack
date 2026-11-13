"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	devtool: false,
	module: {
		rules: [{ test: /\.css$/, type: "css", use: "./loader.js" }]
	},
	experiments: {
		css: true
	},
	externalsPresets: {
		node: true
	},
	node: {
		__dirname: false
	}
};
