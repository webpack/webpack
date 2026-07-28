"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		generator: {
			"css/auto": {
				// Predictable scoping so JS-export assertions can compare against a fixed string.
				localIdentName: "[local]"
			}
		}
	}
};
