"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false,
		concatenateModules: true,
		usedExports: true,
		providedExports: false
	}
};
