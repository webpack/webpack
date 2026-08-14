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
		// Off the elements the spec defines them for, the same spellings are
		// author attributes whose meaning is a script's, so nothing is dropped.
		expect(page).toContain(
			"<x-foo rel ping headers blocking sizes>kept: none of these"
		);
		expect(page).toContain("<div rel for>kept: an author attribute");
		expect(page).toContain("<label for>kept: one id on a label");
		expect(page).toContain("<output>dropped: a token list on this one");
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
