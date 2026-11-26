"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {(concatenateModules: boolean) => Configuration} */
const config = (concatenateModules) => ({
	mode: "production",
	optimization: {
		concatenateModules,
		usedExports: true,
		providedExports: true,
		minimize: false
	}
});

/** @type {Configuration[]} */
module.exports = [config(false), config(true)];
