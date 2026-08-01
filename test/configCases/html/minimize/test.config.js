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

		// DOM-absent whitespace (between the doctype and `<html>`) falls away, and
		// an attribute value that needs no quotes drops them.
		expect(html).toContain("<!DOCTYPE html><html lang=en>");

		// Text, entities and inline structure stay byte-for-byte (never collapsed
		// or re-encoded): the same computed DOM.
		expect(html).toContain("<p>Hello <b>world</b> &amp; friends</p>");

		// Omitted optional end tags are materialized (`</li>`), and the parser's
		// implied `<tbody>` stays transparent while cells get their `</td>`.
		expect(html).toContain("</li><li>two");
		expect(html).toContain("<table><tr><td>a</td><td>b</td></tr></table>");

		// `<pre>` whitespace is significant and preserved verbatim.
		expect(html).toContain("<pre>  preformatted\n   text\n</pre>");

		// Opening tags are respelled, never re-contented: the whitespace between
		// attributes collapses, a value that needs no quotes drops them, `x=""`
		// becomes the equivalent valueless `x`, and a value ending in `/` (or
		// holding whitespace) keeps them.
		expect(html).toContain(
			'<a href=#top title="a title" data-empty data-slash="/end/">link</a>'
		);
		// A value holding one quote kind is wrapped in the other, and a foreign
		// element's source `/>` survives — with a space, so the `/` cannot fuse
		// into the unquoted value before it.
		expect(html).toContain("<span data-quote='say \"hi\"'>q</span>");
		expect(html).toContain('<svg viewBox="0 0 8 8"><rect x=1 y=2 /></svg>');
	}
};
