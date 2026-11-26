"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	module: {
		parser: {
			html: {
				sources: false
			}
		}
	},
	experiments: {
		html: true
	}
};
