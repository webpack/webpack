"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	output: {
		filename: "lib.mjs",
		library: { type: "module" },
		module: true
	},
	module: {
		rules: [{ test: /[\\/]pure-cjs\.js$/, sideEffects: false }]
	},
	experiments: {
		outputModule: true
	}
};
