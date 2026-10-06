"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const read = (name) =>
			fs.readFileSync(path.join(options.output.path, name), "utf8");
		// The second banner is not extracted, and minifying drops it.
		expect(read("bundle0.css")).toBe(
			".button{color:red}.link{color:blue}/*! For license information please see bundle0.css.LICENSE.txt */"
		);
		expect(read("bundle0.css.LICENSE.txt")).toBe("/*! Kit 1.0 - MIT */\n");
	}
};
