"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function deepLoader(source) {
	// Deeper than any engine's stack lets a recursive descent parser go.
	return source.replace(/DEEP/g, "(".repeat(50000));
};
