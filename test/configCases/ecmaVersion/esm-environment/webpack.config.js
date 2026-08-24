"use strict";

// ESM output renders its own chunk header and its own analyzable `import()`,
// neither of which a script target reaches, so the flags are read again here.
// `import.meta` is es2020, so the versions below it are not asked for.
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
	variant("no-template-literal", { templateLiteral: false })
];
