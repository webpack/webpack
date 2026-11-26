"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [false, true].map((concatenateModules) => ({
	mode: "production",
	optimization: { minimize: false, concatenateModules }
}));
