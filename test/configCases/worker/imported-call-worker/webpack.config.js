"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	target: "web",
	module: {
		rules: [
			{
				test: /\.[cm]?js$/,
				parser: {
					worker: ["spawn() from worker-lib", "..."]
				}
			}
		]
	}
};
