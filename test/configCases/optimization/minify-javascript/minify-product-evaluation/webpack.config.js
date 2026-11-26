"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	output: { module: false, filename: "bundle0.js" },
	optimization: { minimize: true, minimizer: ["..."] },
	experiments: { futureDefaults: true }
};
