"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Production: only there does the const-value optimization feed a value
	// binding. No minify or tree-shake: both rewrite what the test reads.
	mode: "production",
	devtool: false,
	// Keep the real `__filename` so the test can read its own bundle.
	node: { __dirname: false, __filename: false },
	optimization: {
		minimize: false,
		concatenateModules: false,
		usedExports: false
	}
};
