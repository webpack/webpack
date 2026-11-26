"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [true, false].map((mangleExports) => ({
	mode: "production",
	optimization: { minimize: false, mangleExports, concatenateModules: false }
}));
