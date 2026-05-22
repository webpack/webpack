"use strict";

// Verifies the byLayer code path on `collectStaticExternalRequests`:
// `./module.js` gets the `app-layer` issuer layer via module rules, and the
// `byLayer` map declares a `path` external for that layer on top of the base
// `fs` external. The inactive proxy should reserve both — without the fix
// the `path` factory body would reference an undefined closure identifier
// after activation.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	output: {
		library: {
			name: "demo",
			type: "umd"
		}
	},
	externalsType: "umd",
	externals: {
		fs: "fs",
		byLayer: {
			"app-layer": {
				path: "path"
			}
		}
	},
	module: {
		rules: [
			{
				test: /module\.js$/,
				layer: "app-layer"
			}
		]
	},
	experiments: {
		layers: true,
		lazyCompilation: {
			entries: false
		}
	}
};
