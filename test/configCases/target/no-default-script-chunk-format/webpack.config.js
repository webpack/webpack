"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// `es2020` reports ES modules but neither `document` nor node builtins, so a
	// classic-output build has no script chunk format left to default to
	{
		output: { module: false },
		devtool: false,
		target: "es2020"
	}
];
