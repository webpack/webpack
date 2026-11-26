"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	entry: { main: { import: "./index.js", runtime: "shared-rt" } },
	output: { filename: "[name].js" }
};
