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
		// keeps the re-exporting module in the graph; when it is skipped the ids
		// are rewritten to point straight at `source.js` and never reach the
		// cross-module lookup this exercises
		sideEffects: false,
		minimize: false
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config(
		"mangled-namespace-default-reexport without module concatenation",
		false
	),
	config("mangled-namespace-default-reexport with module concatenation", true)
];
