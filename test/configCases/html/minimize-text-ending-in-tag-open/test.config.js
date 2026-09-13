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

		// `</` against the `<` of the tag after it opens a bogus comment, which
		// runs to the next `>` and takes the text with it.
		expect(html).not.toContain("</<");
		expect(html).toContain("<div>b&lt;/</div>");
		// A level further in: the attribute escapes the `&` the inner document
		// wrote, so the iframe decodes `&lt;` and parses the text back.
		expect(html).toContain('srcdoc="<div>a&amp;lt;/</div>"');
	}
};
