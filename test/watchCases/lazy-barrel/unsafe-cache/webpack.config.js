"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	cache: {
		type: "memory"
	},
	module: {
		unsafeCache: true,
		rules: [
			{
				test: /pkg/,
				sideEffects: false
			}
		]
	}
};
