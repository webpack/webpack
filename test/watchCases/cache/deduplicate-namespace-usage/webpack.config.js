"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	optimization: {
		concatenateModules: false,
		minimize: false
	}
};
