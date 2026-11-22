"use strict";

/** @type {import("../../../../../").Configuration} */
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
