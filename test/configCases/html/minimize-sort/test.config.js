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

		expect(page).toContain('<div aa=2 class="aa mm zz" mm=3 zz=1>');
		expect(page).toContain('<div class="a b">');
		// `ping` is a token list too, but it is the order the requests go out in.
		expect(page).toContain('<a href=/x ping="/z /a">');
		// Foreign content keeps its source spelling — a name there is not folded.
		expect(page).toContain("<rect zz=1 aa=2 />");
		expect(page).toContain("<div data-only=1>");
	}
};
