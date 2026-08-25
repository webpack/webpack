"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source, map) {
	const replaced = source.replace("__REPLACED__", "2");

	// Rewrites the code and returns a map for it, so positions stay right.
	this.callback(
		null,
		replaced,
		map || {
			version: 3,
			file: this.resourcePath,
			sources: [this.resourcePath],
			sourcesContent: [source],
			names: [],
			mappings: "AAAA"
		}
	);
};
