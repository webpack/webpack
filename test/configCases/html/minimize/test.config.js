"use strict";

const fs = require("fs");
const path = require("path");

// `output.filename` is `[name].js`, so the test entry bundle is `main.js`.
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

		// Inert comments are dropped; behavior-bearing conditional comments stay.
		expect(html).not.toContain("drop this comment");
		expect(html).toContain("<!--[if IE]><p>ie only</p><![endif]-->");

		// DOM-absent whitespace (between the doctype and `<html>`) falls away.
		expect(html).toContain('<!DOCTYPE html><html lang="en">');

		// Text, entities and inline structure stay byte-for-byte (never collapsed
		// or re-encoded): the same computed DOM.
		expect(html).toContain("<p>Hello <b>world</b> &amp; friends</p>");

		// Omitted optional end tags are materialized (`</li>`), and the parser's
		// implied `<tbody>` stays transparent while cells get their `</td>`.
		expect(html).toContain("</li><li>two");
		expect(html).toContain("<table><tr><td>a</td><td>b</td></tr></table>");

		// `<pre>` whitespace is significant and preserved verbatim.
		expect(html).toContain("<pre>  preformatted\n   text\n</pre>");
	}
};
