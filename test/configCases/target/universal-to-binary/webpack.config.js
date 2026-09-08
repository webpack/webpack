"use strict";

const base = {
	target: ["web", "node"],
	mode: "development",
	output: {
		module: true,
		filename: "[name].mjs"
	},
	module: {
		rules: [
			{
				test: /\.bin$/,
				type: "asset/bytes"
			}
		]
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ name: "web", ...base },
	{ name: "node", ...base }
];
