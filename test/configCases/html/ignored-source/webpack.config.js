"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	resolve: {
		alias: {
			"ignored.png": false
		}
	},
	experiments: {
		html: true
	}
};
