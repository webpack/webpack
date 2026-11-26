"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	output: {
		library: {
			type: "commonjs"
		}
	},
	optimization: {
		minimize: false
	}
};
