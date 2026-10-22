"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	resolve: {
		alias: {
			// both directories resolve, so the context module reads both
			app: [
				path.join(__dirname, "src/first"),
				path.join(__dirname, "src/second")
			]
		}
	}
};
