"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration[]} */
module.exports = [true, false].map((concatenateModules) => ({
	mode: "production",
	optimization: {
		concatenateModules,
		inlineExports: true,
		minimize: false
	}
}));
