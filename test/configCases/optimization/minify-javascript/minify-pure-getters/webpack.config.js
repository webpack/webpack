"use strict";

/** @import { Configuration } from "../../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimizer: ["..."],
		minimize: {
			javascript: {
				compress: { pure_getters: true }
			}
		}
	}
};
