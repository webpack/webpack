"use strict";

/** @type {import("../../../../../").Configuration} */
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
