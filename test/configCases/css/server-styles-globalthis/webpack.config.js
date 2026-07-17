"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	experiments: {
		css: true,
		outputModule: true
	},
	output: {
		// Force the native-globalThis code path (no `__webpack_require__.g` polyfill).
		environment: {
			globalThis: true
		}
	}
};
