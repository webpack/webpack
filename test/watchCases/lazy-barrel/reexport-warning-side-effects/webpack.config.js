"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = /** @type {const} */ ([
	["development", "memory"],
	["production", "filesystem"]
]).map(([mode, type], index) => ({
	mode,
	cache: { type },
	output: { filename: `bundle${index}.js`, clean: false }
}));
