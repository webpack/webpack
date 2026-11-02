"use strict";

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "memory" },
	module: {
		unsafeCache: true,
		rules: [{ test: /parent\.js$/, sideEffects: false }]
	}
};
