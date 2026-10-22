"use strict";

// The harness asserts `stats.hasErrors()` is false for a case whose name does
// not end in "error", so it must agree with the filtered `processErrors` list.
/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: "errors-warnings",
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("FilterErrors", (compilation) => {
				compilation.hooks.processErrors.tap("FilterErrors", () => []);
			});
			compiler.hooks.done.tap("FilterErrors", (stats) => {
				// the hook filters what is reported, not what was recorded
				if (stats.compilation.errors.length !== 1) {
					throw new Error("expected the unresolved request to be recorded");
				}
			});
		}
	]
};
