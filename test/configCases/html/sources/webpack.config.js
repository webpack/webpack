"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	optimization: {
		concatenateModules: true
	},
	experiments: {
		html: true
	}
};
