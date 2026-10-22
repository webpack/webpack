"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const read = (name) =>
			fs.readFileSync(path.join(options.output.path, name), "utf8");
		// Only the comment on line 5, column 0 is taken; the rest are dropped.
		expect(read("page.html")).not.toMatch(/Kit|@license/);
		expect(read("page.html.LICENSE.txt")).toBe(
			"<!-- @license Apache-2.0 -->\n"
		);
	}
};
