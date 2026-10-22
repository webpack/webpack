"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	cache: {
		type: "memory"
	},
	output: {
		uniqueName: "watch-value"
	},
	experiments: {
		css: true
	}
};
