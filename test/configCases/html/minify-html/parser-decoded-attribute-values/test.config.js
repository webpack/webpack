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

		// `text/html` makes the element an HTML integration point, so the `div`
		// is its child rather than a sibling of the `math`.
		expect(page).toContain(
			"<annotation-xml encoding=text/html><div>an HTML integration point</div></annotation-xml>"
		);
		// `hidden` is the one type the table inserts in place; every other value
		// foster parents the input out to before the table.
		expect(page).toContain("<table><input type=hidden><tr><td>a hidden");
		// `open` makes the template a shadow root, which nothing may move — so
		// the `</a>` reconstructs its anchor after it rather than around it.
		expect(page).toContain(
			"<a href=#x></a><div><template shadowrootmode=open><slot></slot></template><a href=#x></a>"
		);
	}
};
