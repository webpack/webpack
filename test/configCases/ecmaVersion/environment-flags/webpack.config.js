"use strict";

// Every flag `output.environment` states about the grammar, plus the three it
// states about the standard library. Each variant turns exactly one off against
// an otherwise current target: a version sweep only ever reads the flags a
// version happens to group together, so a guard webpack forgot for one of them
// hides behind the rest.
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
 * @returns {import("../../../../").Configuration} configuration
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

/** @type {import("../../../../").Configuration[]} */
module.exports = FLAGS.map(variant);
