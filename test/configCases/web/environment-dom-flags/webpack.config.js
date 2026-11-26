"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	// a browser with `Object.assign`, iterable collections, `remove()` and `append()`
	target: "browserslist:chrome 120",
	output: {
		chunkFilename: "[name].js"
	},
	node: {
		__dirname: false
	},
	performance: {
		hints: false
	},
	experiments: {
		css: true
	},
	optimization: {
		minimize: false
	}
};
