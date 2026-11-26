"use strict";

/** @import { Configuration } from "../../../../" */

// One flag off per variant, against an otherwise current target: a version
// groups flags together, so a guard forgotten for one hides behind the rest.
const FLAGS = [
	"arrowFunction",
	"asyncFunction",
	"bigIntLiteral",
	"const",
	"destructuring",
	"dynamicImport",
	"forOf",
	"generator",
	"let",
	"logicalAssignment",
	"methodShorthand",
	"optionalChaining",
	"spread",
	"templateLiteral",
	"globalThis",
	"hasOwn",
	"symbol"
];

/**
 * @param {string} flag the one flag this variant takes away
 * @returns {Configuration} configuration
 */
const variant = (flag) => ({
	name: flag,
	target: "web",
	entry: "./index.js",
	output: {
		filename: `${flag}/bundle.js`,
		chunkFilename: `${flag}/[name].js`,
		environment: { [flag]: false }
	},
	optimization: {
		chunkIds: "named"
	}
});

/** @type {Configuration[]} */
module.exports = FLAGS.map(variant);
