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
		// The default drops the type/language/charset markers no selector or
		// script can observe, and keeps every attribute one can.
		expect(page).toMatchSnapshot();
		expect(page).toContain("<input type=text");
		expect(page).toContain("<form method=get");
		expect(page).toContain("<button type=submit>");
		expect(page).toContain("<td colspan=1>");
		expect(page).toContain("<textarea wrap=soft>");
		// `media=all` is only in the table for `<link>`, matching @swc/html.
		expect(page).toContain("<style media=all>");
	}
};
