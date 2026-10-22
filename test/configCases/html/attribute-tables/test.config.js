"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const html = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);
		expect(html).toMatchSnapshot();

		// The attributes limited to only known values fold to the keyword.
		expect(html).toContain("<dialog closedby=any>");
		expect(html).toContain("<template shadowrootmode=open>");
		expect(html).toContain("<button popovertargetaction=show");
		expect(html).toContain("<input popovertargetaction=hide");
		// An input's `autocomplete` names autofill rather than a keyword set,
		// so it is not in the table and keeps the case it was written in.
		expect(html).toContain("autocomplete=EMAIL");
	}
};
