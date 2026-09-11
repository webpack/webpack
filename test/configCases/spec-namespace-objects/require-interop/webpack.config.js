"use strict";

/**
 * @param {string} name config name
 * @param {boolean} concatenateModules whether to enable module concatenation
 * @returns {import("../../../../").Configuration} config
 */
const config = (name, concatenateModules) => ({
	name,
	optimization: { concatenateModules },
	module: {
		rules: [{ test: /m\.js$/, parser: { specNamespaceObject: true } }]
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config("require-interop without module concatenation", false),
	config("require-interop with module concatenation", true)
];
