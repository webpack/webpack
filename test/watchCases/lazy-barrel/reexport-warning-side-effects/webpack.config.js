"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = /** @type {const} */ ([
	["development", "memory", "warn"],
	["production", "filesystem", "warn"],
	["development", "memory", "error"]
]).map(([mode, type, exportsPresence], index) => ({
	mode,
	cache: { type },
	output: { filename: `bundle${index}.js`, clean: false },
	module: { parser: { javascript: { exportsPresence } } }
}));
