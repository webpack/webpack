"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		parser: {
			"css/auto": {
				namedExports: false
			}
		},
		generator: {
			"css/auto": {
				localIdentName: "[local]"
			}
		}
	}
};
