"use strict";

/**
 * @param {string} name config name
 * @param {boolean} concatenateModules whether to enable module concatenation
 * @returns {import("../../../../").Configuration} config
 */
const config = (name, concatenateModules) => ({
	name,
	mode: "production",
	optimization: {
		concatenateModules,
		minimize: false
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config("default-export-namespace without module concatenation", false),
	config("default-export-namespace with module concatenation", true)
];
