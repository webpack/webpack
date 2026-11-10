"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ cache: { type: "memory" } },
	{ cache: { type: "filesystem" } },
	{ cache: { type: "memory" }, experiments: { cacheUnaffected: true } }
].map((options, index) => ({
	...options,
	mode: "production",
	output: { filename: `bundle${index}.js`, clean: false },
	optimization: { minimize: false, emitOnErrors: true },
	module: { parser: { javascript: { exportsPresence: "warn" } } }
}));
