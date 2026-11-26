"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: { module: true },
	mode: "development",
	target: ["web", "node"],
	experiments: {
		css: true
	}
};
