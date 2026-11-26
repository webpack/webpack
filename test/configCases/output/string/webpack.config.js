"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry() {
		return {
			a: "./a"
		};
	},
	output: {
		filename: "[name].js"
	}
};
