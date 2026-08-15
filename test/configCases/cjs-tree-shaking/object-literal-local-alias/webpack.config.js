"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	optimization: {
		minimize: false,
		usedExports: true,
		concatenateModules: false
	}
};
