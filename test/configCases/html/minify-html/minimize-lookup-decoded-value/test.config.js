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

		// The viewport `content` is a list this rewrites, found by the `name`.
		expect(html).toContain("width=device-width,initial-scale=1");
		// A `type` only restating what the element already is goes.
		expect(html).not.toContain("text/css");
		expect(html).not.toContain("text/javascript");
		expect(html).toContain("<input>");
	}
};
