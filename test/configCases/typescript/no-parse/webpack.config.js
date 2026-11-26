"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: "./index.ts",
	experiments: {
		typescript: true
	},
	module: {
		noParse: /vendor\.cts$/
	}
};
