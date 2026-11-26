"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry() {
		return Promise.resolve({
			a: "./a",
			b: ["./b"]
		});
	},
	output: {
		filename: "[name].js"
	}
};
