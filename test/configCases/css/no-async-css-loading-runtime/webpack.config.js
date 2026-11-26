"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	externalsPresets: { web: false, webAsync: true },
	experiments: {
		css: true
	},
	node: {
		__dirname: false
	}
};
