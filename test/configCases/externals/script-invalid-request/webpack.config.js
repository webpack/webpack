"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	optimization: {
		minimize: false
	},
	// so the case can read its own bundle back
	node: {
		__filename: false
	},
	externalsPresets: {
		node: true
	},
	externals: {
		// only the first `@` splits, so the version in the URL stays part of it
		valid: "script _@https://cdn.example.com/npm/lodash@4.17.19/lodash.min.js",
		"missing-at": "script something",
		"leading-at": "script @something",
		"trailing-at": "script something@"
	}
};
