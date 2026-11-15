"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "node",
		module: {
			rules: [{ test: /\.png$/, type: "asset/resource" }]
		}
	},
	{
		target: "webworker",
		module: {
			rules: [{ test: /\.png$/, type: "asset/resource" }]
		}
	}
];
