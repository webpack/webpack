"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	module: {
		parser: {
			javascript: {
				dynamicUrl: false
			}
		}
	}
};
