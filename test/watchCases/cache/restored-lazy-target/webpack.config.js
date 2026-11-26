"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "memory" },
	module: {
		unsafeCache: true,
		rules: [{ test: /parent\.js$/, sideEffects: false }]
	}
};
