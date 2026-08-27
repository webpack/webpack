"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: ["missing-directory", { from: "assets/*.png" }]
	}
};
