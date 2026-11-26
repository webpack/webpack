"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: {
		timings: false,
		builtAt: false,
		hash: false,
		modules: true,
		chunks: false
	}
};
