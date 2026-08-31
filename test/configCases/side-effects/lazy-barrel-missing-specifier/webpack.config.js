"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		parser: {
			javascript: {
				exportsPresence: "error"
			}
		}
	},
	optimization: {
		sideEffects: true,
		usedExports: true,
		providedExports: true,
		minimize: false
	}
};
