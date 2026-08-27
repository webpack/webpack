"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		clean: true,
		copy: [{ from: "static", to: "copied" }]
	}
};
