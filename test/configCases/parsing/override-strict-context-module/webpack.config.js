"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: ["./strict"],
	module: {
		parser: {
			javascript: {
				overrideStrict: "strict"
			}
		}
	}
};
