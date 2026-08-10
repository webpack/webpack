"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	entry: "./index.js",
	optimization: {
		minimize: false,
		moduleIds: "named",
		usedExports: true,
		providedExports: true,
		concatenateModules: false
	}
};
