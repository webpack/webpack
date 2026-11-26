"use strict";

/** @import { Configuration } from "../../../../" */

/**
 * @param {string} entry the entry module
 * @returns {Configuration} configuration
 */
const config = (entry) => ({
	entry,
	mode: "development",
	devtool: false,
	experiments: {
		deferImport: true
	},
	optimization: {
		sideEffects: true,
		concatenateModules: false
	}
});

/** @type {Configuration[]} */
module.exports = [config("./index.js"), config("./early.js")];
