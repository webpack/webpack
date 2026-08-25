"use strict";

// ESM output has its own chunk header and analyzable `import()`. Nothing below
// es2020 is asked for: `import.meta` is es2020.
/**
 * @param {string} name variant name
 * @param {import("../../../../declarations/WebpackOptions").Environment} environment what the target lacks
 * @param {import("../../../../").Configuration["target"]=} target build target
 * @returns {import("../../../../").Configuration} configuration
 */
const variant = (name, environment, target = "web") => ({
	name,
	target,
	entry: "./index.js",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		filename: `${name}/bundle.mjs`,
		chunkFilename: `${name}/[name].mjs`,
		environment
	},
	optimization: {
		chunkIds: "named"
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	variant("es2020", {}, ["web", "es2020"]),
	variant("es2022", {}, ["web", "es2022"]),
	variant("no-arrow-function", { arrowFunction: false }),
	variant("no-const", { const: false }),
	variant("no-optional-chaining", { optionalChaining: false }),
	variant("no-template-literal", { templateLiteral: false }),
	variant("no-has-own", { hasOwn: false })
];
