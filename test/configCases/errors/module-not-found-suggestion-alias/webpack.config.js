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
			{ name: "ignored", alias: false }
		]
	}
};
