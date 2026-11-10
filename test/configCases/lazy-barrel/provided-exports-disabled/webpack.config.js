"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	optimization: {
		sideEffects: true,
		providedExports: false,
		concatenateModules: false
	}
};
