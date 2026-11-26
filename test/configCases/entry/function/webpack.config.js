"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry() {
		return {
			a: "./a",
			b: ["./b"]
		};
	},
	output: {
		filename: "[name].js"
	}
};
