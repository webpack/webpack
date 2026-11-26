"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: "./index.js",
	stats: {
		assets: false,
		modules: true,
		reasons: true
	}
};
