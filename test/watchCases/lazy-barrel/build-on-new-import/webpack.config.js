"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /pkg/,
				sideEffects: false
			}
		]
	},
	experiments: {
		lazyBarrel: true
	}
};
