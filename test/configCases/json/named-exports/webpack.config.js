"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	module: {
		parser: {
			json: {
				namedExports: true
			}
		}
	}
};
