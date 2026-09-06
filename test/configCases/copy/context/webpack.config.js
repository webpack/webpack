"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			{ from: ["pkg/a/*.txt", "pkg/b/*.txt"], to: "both" },
			{ from: ["a/*.txt", "b/*.txt"], context: "pkg", to: "rooted" },
			{ from: "*.txt", context: "pkg/a", to: "relative" },
			{
				from: "b/*.txt",
				context: path.resolve(__dirname, "pkg"),
				to: "absolute"
			},
			{ from: ["pkg/a/one.txt", "pkg/a/*.txt"], to: "twice" }
		]
	}
};
