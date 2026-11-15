"use strict";

/** @import { Configuration } from "../../../../" */

const VARIANTS = require("./variants");

/** @type {Configuration[]} */
module.exports = VARIANTS.map(([mode, devtool], i) => ({
	mode,
	devtool,
	target: "node",
	output: {
		filename: `bundle${i}.js`
	}
}));
