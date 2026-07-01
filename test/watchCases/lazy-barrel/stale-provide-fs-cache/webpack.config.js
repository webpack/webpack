"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	cache: {
		type: "filesystem"
	},
	module: {
		parser: {
			javascript: {
				exportsPresence: "error"
			}
		},
		rules: [
			{
				test: /pkg/,
				sideEffects: false
			}
		]
	}
};
