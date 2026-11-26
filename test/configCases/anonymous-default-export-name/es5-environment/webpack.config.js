"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		environment: {
			module: false,
			const: false,
			arrowFunction: false,
			bigIntLiteral: false,
			destructuring: false,
			dynamicImport: false,
			forOf: false
		}
	}
};
