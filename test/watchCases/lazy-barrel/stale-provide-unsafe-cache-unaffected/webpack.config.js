"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	cache: {
		type: "memory",
		cacheUnaffected: true
	},
	experiments: {
		cacheUnaffected: true
	},
	module: {
		unsafeCache: true,
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
