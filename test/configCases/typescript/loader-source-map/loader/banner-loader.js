"use strict";

// A toy loader that prepends a banner comment and a blank line, then emits
// a source map. Used to verify that the built-in TypeScript transform
// composes its source map with the loader's, so the final map still points
// back to the loader's original input (the on-disk `.ts` content).

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function (source) {
	const banner = "// banner\n\n";
	const generated = banner + source;
	const offset = banner.split("\n").length - 1;
	const inputLines = source.split("\n").length;

	const mappings =
		";".repeat(offset) +
		Array.from({ length: inputLines }, (_, i) =>
			i === 0 ? "AAAA" : ";AACA"
		).join("");

	this.callback(null, generated, {
		version: 3,
		file: this.resourcePath,
		sources: [this.resourcePath],
		sourcesContent: [source],
		names: [],
		mappings
	});
};
