"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	experiments: {
		css: true,
		outputModule: true
	}
};
