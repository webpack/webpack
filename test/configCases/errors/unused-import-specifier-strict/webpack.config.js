"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	module: {
		// strict harmony resolves export presence to an error
		rules: [{ test: /\.js$/, type: "javascript/esm" }]
	}
};
