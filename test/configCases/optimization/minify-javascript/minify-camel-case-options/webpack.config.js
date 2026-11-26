"use strict";

/** @import { Configuration } from "../../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimizer: ["..."],
		minimize: {
			javascript: {
				keepFnames: true,
				keepClassnames: true,
				format: { asciiOnly: true }
			}
		}
	}
};
