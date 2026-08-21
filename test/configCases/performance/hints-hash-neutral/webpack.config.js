"use strict";

/**
 * @param {number} index position of this config, so its files stay apart
 * @param {import("../../../../").Configuration["performance"]} performance the hint settings
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, performance) => ({
	mode: "production",
	optimization: { minimize: false },
	output: { filename: `bundle${index}.js` },
	performance
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, { hints: false }),
	// Same sources, one hint switched on: the hash has to be the same.
	base(1, { hints: "warning", missingSideEffects: true })
];
