"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	performance: {
		hints: "stats",
		// Any bundle exceeds this, so the size hint always fires.
		maxAssetSize: 1,
		maxEntrypointSize: 1
	},
	plugins: [
		(compiler) => {
			compiler.hooks.done.tap("Test", (stats) => {
				const json = stats.toJson({ all: false, hints: true });
				const hints = json.hints || [];
				const messages = hints.map((hint) => hint.message).join("\n");
				if (!/recommended size limit/.test(messages)) {
					throw new Error(`unexpected hints: ${messages}`);
				}
				if (stats.compilation.warnings.length !== 0) {
					throw new Error("hint must not be a warning");
				}
			});
		}
	]
};
