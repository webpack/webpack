"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((futureDefaults) => ({
	// terser minifies outside `futureDefaults`, webpack's minifier within it.
	mode: "production",
	experiments: { futureDefaults },
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
}));
