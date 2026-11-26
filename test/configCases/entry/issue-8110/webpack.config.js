"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		bundle0: "./a",
		other: "./b"
	},
	output: {
		filename: "[name].js"
	}
};
