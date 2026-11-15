"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = /** @type {const} */ (["memory", "filesystem"]).map(
	(type, index) => ({
		mode: "production",
		// an entry and an entry's own import go missing too
		entry: {
			bundle: "./index.js",
			extra: "./extra.js",
			"missing-entry": "./missing-entry.js"
		},
		// a cached module whose content did not change is restored, not rebuilt
		cache: { type },
		output: { filename: `[name]${index}.js`, clean: false },
		optimization: { minimize: false, emitOnErrors: true },
		module: { parser: { javascript: { exportsPresence: "warn" } } }
	})
);
