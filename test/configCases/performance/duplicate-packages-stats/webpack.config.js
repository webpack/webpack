"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	performance: {
		hints: "stats",
		duplicatePackages: true
	},
	plugins: [
		(compiler) => {
			compiler.hooks.done.tap("Test", (stats) => {
				const json = stats.toJson({ all: false, hints: true });
				const hints = json.hints || [];
				if (hints.length !== 1) {
					throw new Error(`expected 1 hint, got ${hints.length}`);
				}
				if (
					!/Multiple versions of the package "dup-lib"/.test(hints[0].message)
				) {
					throw new Error(`unexpected hint: ${hints[0].message}`);
				}
				if (stats.compilation.warnings.length !== 0) {
					throw new Error("hint must not be a warning");
				}
			});
		}
	]
};
