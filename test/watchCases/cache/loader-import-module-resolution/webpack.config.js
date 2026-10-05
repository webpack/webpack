"use strict";

/** @type {import("../../../..").Configuration[]} */
module.exports = ["./loader.js", "./load-loader.js"].map((loader, index) => ({
	output: { filename: `bundle${index}.js`, clean: false },
	module: {
		rules: [{ test: /\.generated$/, use: loader }]
	}
}));
