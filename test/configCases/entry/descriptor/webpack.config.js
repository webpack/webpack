"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry() {
		return {
			a: { import: "./a" },
			b: { import: ["./b"] }
		};
	},
	output: {
		filename: "[name].js"
	}
};
