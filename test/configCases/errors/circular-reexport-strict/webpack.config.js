"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		// strict harmony makes export-presence an error, so the circular
		// diagnostic has to stay a warning of its own
		rules: [{ test: /\.js$/, type: "javascript/esm" }]
	}
};
