"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js" }
};
