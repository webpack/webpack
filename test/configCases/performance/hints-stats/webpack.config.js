"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		unusedRules: true
	},
	module: {
		rules: [
			{ test: /\.js$/, use: [] },
			{ test: /\.never-matches$/, loader: "./loader" }
		]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.done.tap("Test", (stats) => {
				const json = stats.toJson({ all: false, hints: true });
				const hints = json.hints || [];
				if (hints.length !== 1) {
					throw new Error(`expected 1 hint, got ${hints.length}`);
				}
				if (!/module\.rules\[1\]/.test(hints[0].message)) {
					throw new Error(`unexpected hint: ${hints[0].message}`);
				}
				if (stats.compilation.warnings.length !== 0) {
					throw new Error("hint must not be a warning");
				}
				if (stats.compilation.errors.length !== 0) {
					throw new Error("hint must not be an error");
				}
			});
		}
	]
};
