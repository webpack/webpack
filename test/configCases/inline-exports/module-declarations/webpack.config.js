"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	optimization: {
		concatenateModules: false,
		inlineExports: true,
		moduleIds: "named",
		sideEffects: true,
		usedExports: true
	}
};
