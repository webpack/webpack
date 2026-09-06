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
			},
			{
				from: "assets/*.txt",
				globOptions: { caseSensitive: false },
				to: "insensitive"
			},
			{
				from: "assets/**/*.txt",
				globOptions: { dot: false },
				to: "no-dot"
			},
			{
				from: "assets/**/*.txt",
				globOptions: { deep: 1 },
				to: "shallow"
			},
			{
				from: "assets/**/*.txt",
				globOptions: { ignore: ["**/sub/**"] },
				to: "no-sub"
			},
			{
				// a glob naming the directory itself skips everything below it
				from: "assets/**/*.txt",
				globOptions: { ignore: ["assets/.hidden"] },
				to: "no-hidden"
			}
		]
	}
};
