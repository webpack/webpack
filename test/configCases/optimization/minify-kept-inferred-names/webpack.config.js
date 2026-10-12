"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((mangle) => ({
	mode: "production",
	experiments: { futureDefaults: true },
	optimization: {
		minimizer: ["..."],
		minimize: {
			javascript: {
				mangle,
				keep_fnames: mangle ? /^preserved$/ : true,
				keep_classnames: mangle ? /^preservedClass$/ : true
			}
		}
	}
}));
