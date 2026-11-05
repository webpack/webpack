"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "none",
		optimization: {
			usedExports: true,
			innerGraph: true,
			providedExports: true
		}
	},
	{
		mode: "production"
	}
];
