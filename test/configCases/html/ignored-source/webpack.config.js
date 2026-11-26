"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	resolve: {
		alias: {
			"ignored.png": false
		}
	},
	experiments: {
		html: true
	}
};
