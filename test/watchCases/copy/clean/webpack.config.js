"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		clean: true,
		copy: [{ from: "static", to: "copied" }]
	}
};
