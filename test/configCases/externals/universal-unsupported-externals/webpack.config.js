"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "web"],
	externals: {
		thisExt: "this Foo"
	},
	// Also unsupported but env- or config-specific, so not asserted here: browser
	// globals, the types needing a matching `output.libraryTarget`, DOM-only `script`,
	// and the non-JS module types.
	output: { module: true }
};
