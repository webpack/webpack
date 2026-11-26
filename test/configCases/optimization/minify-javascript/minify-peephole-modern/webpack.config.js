"use strict";

/** @import { Configuration } from "../../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: ["web", "es2022"],
	experiments: { futureDefaults: true },
	output: { filename: "bundle0.js", module: false },
	optimization: {
		minimizer: ["..."],
		minimize: {
			javascript: {
				compress: { passes: 2 },
				mangle: false,
				keep_fnames: true,
				keep_classnames: true
			}
		}
	}
};
