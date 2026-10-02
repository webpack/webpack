"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false,
		concatenateModules: true,
		usedExports: true,
		providedExports: false
	}
};
