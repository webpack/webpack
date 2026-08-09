"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false,
		moduleIds: "named",
		sideEffects: true,
		providedExports: true,
		usedExports: true
	}
};
