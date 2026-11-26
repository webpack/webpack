"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	optimization: {
		moduleIds: "named",
		usedExports: true,
		providedExports: true,
		concatenateModules: true
	}
};
