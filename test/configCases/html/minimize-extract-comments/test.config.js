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
		const page = read("page.html");
		// An HTML comment, not a `/*!` line the page would show as text, and at
		// the end, so the doctype stays first.
		expect(page).toMatch(/^<!doctype html>/);
		expect(page).toMatch(
			/<!-- For license information please see page\.html\.LICENSE\.txt -->$/
		);
		expect(page).not.toContain("Kit");
		expect(page).not.toContain("@license");
		expect(page).not.toContain("plain note");
		// A conditional comment is code, so it is never taken.
		expect(page).toContain("<!--[if IE]><p>old</p><![endif]-->");
		expect(read("page.html.LICENSE.txt")).toBe(
			"<!-- @license Apache-2.0 -->\n\n<!--! Kit 1.0 - MIT -->\n"
		);
	}
};
