"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	optimization: {
		mangleExports: true,
		usedExports: true,
		providedExports: true,
		sideEffects: false // disable reexports optimization
	}
};
