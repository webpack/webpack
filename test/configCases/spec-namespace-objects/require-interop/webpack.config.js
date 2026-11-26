"use strict";

/** @import { Configuration } from "../../../../" */

/**
 * @param {string} name config name
 * @param {boolean} concatenateModules whether to enable module concatenation
 * @returns {Configuration} config
 */
const config = (name, concatenateModules) => ({
	name,
	optimization: { concatenateModules },
	module: {
		rules: [{ test: /m\.js$/, parser: { specNamespaceObject: true } }]
	}
});

/** @type {Configuration[]} */
module.exports = [
	config("require-interop without module concatenation", false),
	config("require-interop with module concatenation", true)
];
