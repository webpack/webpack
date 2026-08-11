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

		expect(page).not.toContain("<div></div><p>");
		expect(page).toContain("<p>kept: has text");
		// Any attribute at all means it was written for a reason.
		expect(page).toContain("<div id=mount></div><div class=spacer></div>");
		expect(page).toContain("<script src=x.js></script>");
		// Bare, each of these is still doing its job.
		for (const tag of [
			"canvas",
			"slot",
			"template",
			"textarea",
			"progress",
			"meter",
			"output",
			"dialog"
		]) {
			expect(page).toContain(`<${tag}></${tag}>`);
		}
		// Dropping a cell would shift every one after it.
		expect(page).toContain("<td><td>a");
		// Void elements are childless by definition; foreign content is not ours.
		expect(page).toContain("<br><img src=x.png><input>");
		expect(page).toContain("<svg></svg>");
		// Emptiness is read off the source tree in one pass, so the parent that
		// only became empty here is not itself dropped.
		expect(page).toContain("<div></div>");
		// A void element that belongs in the head states nothing without
		// attributes, unlike every other void element.
		expect(page).not.toContain("<meta><link><base>");
		expect(page).toContain("<meta charset=utf-8><link rel=preload href=x.css>");
		// A whitespace text node is a child.
		expect(page).toContain("<div> </div>");
	}
};
