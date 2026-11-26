"use strict";

const { ConsumeSharedPlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
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
