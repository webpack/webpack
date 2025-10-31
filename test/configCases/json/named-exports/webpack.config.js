"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		parser: {
			json: {
				namedExports: true
			}
		}
	}
};
