"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	module: {
		parser: {
			html: {
				sources: false
			}
		}
	},
	experiments: {
		html: true
	}
};
