"use strict";

/**
 * @param {string} name config name
 * @param {boolean} concatenateModules whether to concatenate
 * @returns {import("../../../../").Configuration} configuration
 */
const config = (name, concatenateModules) => ({
	name,
	optimization: { concatenateModules },
	module: {
		rules: [{ test: /(m|inner)\.js$/, parser: { specNamespaceObject: true } }]
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config("nested-namespace without module concatenation", false),
	config("nested-namespace with module concatenation", true)
];
