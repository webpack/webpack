"use strict";

/** @type {(concatenateModules: boolean) => import("../../../../").Configuration} */
const config = (concatenateModules) => ({
	mode: "production",
	optimization: {
		concatenateModules,
		usedExports: true,
		providedExports: true,
		minimize: false
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [config(false), config(true)];
