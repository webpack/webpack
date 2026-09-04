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

		expect(page).toContain('class="aa mm zz"');
		// Neither is a set: `ping` is the order its requests go out in, and a
		// `srcset` is no token list at all.
		expect(page).toContain('ping="/z /a"');
		expect(page).toContain('srcset="a.png   1x"');
	}
};
