"use strict";

const { ConsumeSharedPlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new ConsumeSharedPlugin({
			consumes: [
				"plus-range",
				"dash-range",
				"number-range",
				"nested-number-range",
				"mixed-range"
			]
		})
	]
};
