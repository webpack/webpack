"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	// mode: "development" || "production",
	optimization: {
		concatenateModules: false
	}
};

module.exports = config;
