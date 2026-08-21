"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		filename: "[name].js",
		// the global scope is reached as `globalThis` instead of through the polyfill
		environment: { globalThis: true }
	}
};
