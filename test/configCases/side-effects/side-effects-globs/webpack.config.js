"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false,
		moduleIds: "named",
		sideEffects: true,
		providedExports: true,
		usedExports: true
	}
};
