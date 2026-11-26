"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [false, true].map((concatenateModules) => ({
	mode: "production",
	target: "node14",
	optimization: {
		concatenateModules,
		mangleExports: "size",
		minimize: false
	}
}));
