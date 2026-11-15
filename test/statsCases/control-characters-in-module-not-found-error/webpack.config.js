"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index.js",
	// Keep the resolve log short and free of paths outside the case
	resolve: { descriptionFiles: [], extensions: [], extensionAlias: {} },
	stats: {
		all: false,
		errors: true,
		errorDetails: true
	}
};
