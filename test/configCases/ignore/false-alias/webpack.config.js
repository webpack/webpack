"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./test.js",
	resolve: {
		alias: {
			"ignored-module": false,
			"./ignored-module": false
		}
	}
};
