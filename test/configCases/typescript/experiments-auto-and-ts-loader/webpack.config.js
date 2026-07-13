"use strict";

// `experiments.typescript` stays at its "auto" default: a registered ts-loader
// must auto-disable the built-in support so the user's loader owns `.ts`.

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.ts",
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			}
		]
	}
};
