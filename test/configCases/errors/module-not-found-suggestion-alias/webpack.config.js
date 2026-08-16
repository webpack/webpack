"use strict";

const path = require("path");

const source = path.resolve(__dirname, "src");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	resolve: {
		alias: [
			{ name: "@", alias: source },
			// The first target does not exist, so the second one answers
			{ name: "~", alias: [path.resolve(__dirname, "nope"), source] },
			// Matches the whole request only, never a path below it
			{
				name: "only",
				alias: path.resolve(source, "Button.js"),
				onlyModule: true
			},
			// Tells the resolver to ignore the request, so it names no path
			{ name: "ignored", alias: false },
			// More targets than a failed request is looked under, so the last one
			// is never reached
			{
				name: "many",
				alias: [
					...Array.from({ length: 15 }, (_, i) =>
						path.resolve(__dirname, `nope-${i}`)
					),
					source
				]
			}
		]
	}
};
