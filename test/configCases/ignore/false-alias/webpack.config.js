"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: "./test.js",
	resolve: {
		alias: {
			"ignored-module": false,
			"./ignored-module": false
		}
	}
};
