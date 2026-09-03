"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			{ from: "assets/**/*.txt", to: "all" },
			{ from: "assets/.hidden/*.txt", to: "explicit-dot" },
			{
				from: path.resolve(__dirname, "assets/keep.txt"),
				filename: "absolute.txt"
			},
			{
				from: [path.resolve(__dirname, "assets"), "sub", "..", "*.txt"].join(
					"/"
				),
				to: "dots"
			},
			{ from: path.resolve(__dirname, "assets/sub"), to: "absolute-dir" },
			{
				// a `\` in an absolute pattern separates, as `path.join` writes it
				from: [path.resolve(__dirname, "assets"), "*.txt"].join("\\"),
				to: "backslash"
			}
		]
	}
};
