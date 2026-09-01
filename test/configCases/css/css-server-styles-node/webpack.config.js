"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	module: {
		// a document-less target defaults to `exportsOnly`, emitting no stylesheets;
		// opt in so the server build writes them like the client build does
		generator: {
			css: {
				exportsOnly: false
			}
		}
	},
	experiments: {
		css: true,
		outputModule: true
	}
};
