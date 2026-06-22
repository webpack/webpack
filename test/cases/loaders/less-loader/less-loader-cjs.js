"use strict";

// Thin wrapper around less-loader. Bun aborts in its node:vm
// SourceTextModule.link() and Deno hard-panics ("Module not found") on
// less-loader's `import("less")`, so on both inject the CJS less to skip the
// dynamic import. On Node it delegates unchanged.
const lessLoader = require("less-loader");

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(content) {
	if (process.versions.bun || process.versions.deno) {
		// Make less-loader read the CJS less (skips its crashing `import("less")`).
		const ctx = /** @type {EXPECTED_ANY} */ (this);
		const getOptions = ctx.getOptions.bind(ctx);
		ctx.getOptions = (/** @type {EXPECTED_ANY} */ schema) => ({
			implementation: require("less"),
			...getOptions(schema)
		});
	}
	return lessLoader.call(this, content);
};
