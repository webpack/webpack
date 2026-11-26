"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{ mode: "development", entry: "./typed-first.js" },
	{ mode: "development", entry: "./plain-first.js" },
	{
		mode: "development",
		entry: "./typed-first.js",
		// a layer named like the typed module's marker stays apart from it
		module: { rules: [{ test: /plain\.js$/, layer: "default-only" }] }
	}
];
