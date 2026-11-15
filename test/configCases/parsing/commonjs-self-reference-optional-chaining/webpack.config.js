"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((concatenateModules) => ({
	mode: "production",
	target: "node14",
	optimization: {
		concatenateModules,
		mangleExports: "size",
		minimize: false
	}
}));
