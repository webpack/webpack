"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "web"],
	externals: {
		thisExt: "this Foo"
	},
	// Also unsupported but env-/config-specific (not asserted here):
	//   window/self (browser globals), amd/amd-require/umd/umd2/jsonp/system
	//   (need a matching `output.libraryTarget`), script (DOM-only),
	//   asset/asset-url/css-import/css-url (non-JS module types).
	output: { module: true },
	experiments: { outputModule: true }
};
