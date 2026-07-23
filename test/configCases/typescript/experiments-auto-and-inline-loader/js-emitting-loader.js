"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	// Emits already-plain JS (no type syntax) for a `.ts` resource — mirrors
	// html-webpack-plugin's template loader. The built-in strip-types must be a
	// harmless no-op here, not a misparse.
	return "module.exports = 7 * 3;";
};
