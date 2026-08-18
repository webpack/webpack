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

		// A CR the tokenizer would rewrite to LF: it stays a character reference,
		// so the text re-parses to the character the source named.
		expect(html).toContain("A&#13;B");
		expect(html).not.toContain("A\rB");

		// Inert comments are dropped; behavior-bearing conditional comments stay.
		expect(html).not.toContain("drop this comment");
		expect(html).toContain("<!--[if IE]><p>ie only</p><![endif]-->");

		// DOM-absent whitespace (between the doctype and `<html>`) falls away,
		// and a value that needs no quotes loses them.
		expect(html).toContain("<!doctype html><html lang=en>");

		// Text, entities and inline structure stay byte-for-byte (never collapsed
		// or re-encoded): the same computed DOM.
		expect(html).toContain("<p>Hello <b>world</b> & friends");

		// An optional end tag the next sibling implies is left out (§13.1.2.4),
		// and the parser's implied `<tbody>` stays transparent.
		expect(html).toContain("<li>one");
		expect(html).toContain("<li>two");
		expect(html).not.toContain("</li>");
		expect(html).toContain("<table><tr><td>a<td>b</table>");

		// `<pre>` whitespace is significant and preserved verbatim.
		expect(html).toContain("<pre>  preformatted\n   text\n</pre>");
	}
};
