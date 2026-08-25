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

		// `smart`: no line box reaches the whitespace at a block's edge.
		expect(page).toContain("<div>a b</div>");
		expect(page).toContain("<div>c</div>");
		// A `<span>`'s own spaces render, so they survive every mode but `all`.
		expect(page).toContain("<span> d </span>");
		// Whitespace renders verbatim here whatever the mode says.
		expect(page).toContain("<pre>  verbatim   here  </pre>");

		// The pattern says which comments survive; nothing else does.
		expect(page).toContain("@license MIT");
		expect(page).not.toContain("ordinary chatter");
		// The markup inside the conditional comment was minified in place.
		expect(page).toContain("<!--[if IE 8]><p class=a>ie");
		expect(page).toContain("<![endif]-->");
	}
};
