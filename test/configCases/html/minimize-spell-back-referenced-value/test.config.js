"use strict";

const fs = require("fs");
const path = require("path");

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
		expect(html).toMatchSnapshot();

		// Nothing here is rewritten — what shortens the value is spelling it as
		// what it decodes to, which the frozen quoting does not hold back.
		expect(html).toContain('href="/a"');
		expect(html).toContain('type="text"');
		expect(html).toContain('content="width=device-width"');
		// The rewrites reach a referenced value under the same quoting.
		expect(html).toContain('action="/post"');
		expect(html).toContain('type="search"');
		// A delimiter the source chose is the one it keeps, quoted or not.
		expect(html).toContain("name=viewport");
		expect(html).toContain("href='/b'");
		// A value carrying no reference is rewritten under its own delimiter too.
		expect(html).toContain("href='/c'");
		// The rewrite is spelled back under the frozen delimiter, and neither `&x`
		// nor `&y` names a reference, so neither costs an escape.
		expect(html).toContain('href="&x&y"');
		// What the value itself holds outranks the delimiter the source chose:
		// each lands under the quote it needs no reference for.
		expect(html).toContain('title="it\'s"');
		expect(html).toContain("title='say \"hi\"'");
	}
};
