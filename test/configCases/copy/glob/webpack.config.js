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
			}
		]
	}
};
