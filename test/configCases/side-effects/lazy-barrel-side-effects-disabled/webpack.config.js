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
		sideEffects: false,
		usedExports: true,
		providedExports: true,
		concatenateModules: false,
		minimize: false
	}
};
