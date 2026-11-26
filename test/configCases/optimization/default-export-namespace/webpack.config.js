"use strict";

/** @import { Configuration } from "../../../../" */

/**
 * @param {string} name config name
 * @param {boolean} concatenateModules whether to enable module concatenation
 * @returns {Configuration} config
 */
const config = (name, concatenateModules) => ({
	name,
	mode: "production",
	optimization: {
		concatenateModules,
		minimize: false
	}
});

/** @type {Configuration[]} */
module.exports = [
	config("default-export-namespace without module concatenation", false),
	config("default-export-namespace with module concatenation", true)
];
