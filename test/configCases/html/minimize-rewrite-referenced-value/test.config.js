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

		// Each of these is a list or keyword the value decodes to, minified the
		// same as it would be written out.
		expect(html).toContain("width=device-width,initial-scale=1");
		expect(html).toContain("type=text");
		expect(html).not.toMatch(/srcset="[^"]*, /);
		// A boolean attribute spelled with its own name is the bare name, whichever
		// way the source spelled that name.
		expect(html).toContain("<input type=checkbox checked>");
		expect(html).toContain("<option selected>");
		// A URL attribute strips its own padding when parsed, so the rewrite has
		// to reach one spelled with references too.
		expect(html).toMatch(/href=["']?\.\/a\.png/);
		expect(html).not.toContain("&#x20;&#x2e;&#x2f;");
		// With the source spelling out of the running the rewrite is written at
		// its shortest, which is the fixed point a second pass would reach.
		expect(html).toContain("<a href=&amp;x&amp;y>");
	}
};
