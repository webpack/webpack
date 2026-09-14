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
	}
};
