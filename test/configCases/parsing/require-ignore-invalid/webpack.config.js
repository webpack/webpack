"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	module: {
		parser: {
			javascript: {
				commonjsMagicComments: true
			}
		}
	}
};
