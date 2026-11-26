"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { pathinfo: false },
	optimization: { minimize: true, minimizer: ["..."] },
	experiments: { html: true }
};
