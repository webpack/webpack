"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
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
