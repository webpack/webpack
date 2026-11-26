"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	module: {
		parser: {
			json: {
				exportsDepth: Infinity
			}
		}
	}
};
