"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Production: the const-value optimization that feeds a value binding only
	// runs there. Minifying would rewrite the runtime the test reads, and
	// dropping unused exports would remove the `__webpack_require__.d` call.
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
