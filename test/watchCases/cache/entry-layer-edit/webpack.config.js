"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: { main: { import: "./index.js", layer: "fixed" } }
};
