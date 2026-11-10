"use strict";

/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = function (source) {
	// A literal, valid U+FFFD: decoding loses nothing, so the source test still applies.
	return Buffer.from(`${source}// �\n`, "utf8");
};
