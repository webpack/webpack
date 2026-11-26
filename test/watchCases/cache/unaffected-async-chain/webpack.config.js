"use strict";

/** @import { Configuration } from "../../../.." */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "memory" },
	optimization: { concatenateModules: false, usedExports: false }
};
