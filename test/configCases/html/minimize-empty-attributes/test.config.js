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

		expect(page).toContain("<div>dropped</div>");
		expect(page).toContain("<div>valueless is the empty value</div>");
		// An all-whitespace value is empty, but the value is read raw — a
		// character reference is kept whatever it decodes to.
		expect(page).toContain("<div id=&#x20;>whitespace is empty too");
		// The spec gives an empty `title` / `lang` a meaning absence does not: no
		// advisory information rather than the ancestor's, and unknown language
		// rather than the inherited one.
		// Kept — and spelled bare, which is the same empty value in fewer bytes.
		expect(page).toContain("<div title lang>kept");
		// An empty token list is no tokens, which is what absence gives.
		expect(page).toContain("<div>dropped: an empty token list is no tokens");
		expect(page).toContain(
			"<a href=x>dropped: on the element that carries them"
		);
		expect(page).toContain("<td>dropped: here too");
		// Except `sandbox`: its empty list is the most restrictive state there is,
		// and absence is the least.
		expect(page).toContain("<iframe sandbox src=x.html>");
		// An empty handler body still compiles, so `el.onclick` reads back a
		// function where absence reads null.
		expect(page).toContain("<div onclick onmouseover>kept");
		// Nothing outside the table is touched, empty or not.
		expect(page).toContain("<div data-x aria-label role>kept");
		expect(page).toContain("<div class=a id=b style=color:red dir=rtl>kept");
	}
};
