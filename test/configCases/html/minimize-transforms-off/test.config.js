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

		// One assertion per switch, naming what it stopped.
		expect(page).toContain("<!-- an inert comment");
		// No switch reaches a `style=""`: it is offered as css like an inline
		// `<style>`, and a caller wanting it kept says so with its own renderer.
		expect(page).toContain("style=color:red");
		expect(page).toContain('href="  /a  "');
		expect(page).toContain("<li>one</li>");
		expect(page).toContain('disabled="disabled"');
		expect(page).toContain('type="TEXT"');
		expect(page).toContain('tabindex=" 03 "');
		expect(page).toContain('class="  b   a "');
		expect(page).toContain('data-x="plain"');
		// No switch reaches a JSON `<script>`: it is an embedded body, minified by
		// whatever answers for it and by webpack's own minifier when nothing does.
		expect(page).toContain('{"a":1}');
	}
};
