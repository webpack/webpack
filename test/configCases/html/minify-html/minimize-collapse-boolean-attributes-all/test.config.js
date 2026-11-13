"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const page = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);
		expect(page).toMatchSnapshot();

		// The value never reaches the DOM, so `checked="false"` is a checked box
		// at this tier as much as `checked="checked"` is at the default one.
		expect(page).toContain("<input checked disabled>");
		expect(page).toContain("<script defer>");
		// An enumerated attribute names a state, and `checked` is boolean only on
		// the elements the spec defines it for.
		expect(page).toContain("contenteditable=contenteditable");
		expect(page).toContain("checked=false");
	}
};
