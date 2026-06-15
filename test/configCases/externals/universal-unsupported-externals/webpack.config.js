"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "web"],
	// require-based externals can't produce runnable output in an ESM bundle
	externals: {
		commonjsExt: "commonjs fs",
		commonjs2Ext: "commonjs2 fs",
		commonjsModuleExt: "commonjs-module fs",
		commonjsStaticExt: "commonjs-static fs",
		thisExt: "this Foo"
	},
	// Also unsupported but env-/config-specific (not asserted here):
	//   global/window/self (browser globals / `output.globalObject`),
	//   amd/amd-require/umd/umd2/jsonp/system (need a matching `output.libraryTarget`),
	//   script (DOM-only), asset/asset-url/css-import/css-url (non-JS module types).
	output: { module: true },
	experiments: { outputModule: true }
};
