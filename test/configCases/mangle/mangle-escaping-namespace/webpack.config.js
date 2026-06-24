"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	// `del.js` intentionally deletes non-existent namespace members.
	module: { parser: { javascript: { exportsPresence: false } } },
	optimization: {
		usedExports: true,
		providedExports: true,
		mangleExports: true,
		inlineExports: true,
		concatenateModules: false,
		minimize: false
	}
};
