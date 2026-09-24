"use strict";

const fs = require("fs");
const path = require("path");
const htmlMinify = require("../../../../lib/html/htmlMinify");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	async afterExecute(options) {
		const cases = fs
			.readdirSync(path.resolve(__dirname, "cases"))
			.filter((file) => file.endsWith(".html"))
			.sort();
		/** @type {Record<string, string>} */
		const emitted = {};
		for (const file of cases) {
			const html = fs.readFileSync(
				path.join(options.output.path, file),
				"utf8"
			);
			// What the input left open is closed on the first pass, so a second
			// one finds nothing to close — before, each pass closed it again.
			const again = await htmlMinify({ [file]: html });
			expect({ file, html: again.code }).toEqual({ file, html });
			emitted[file] = html;
		}
		// §13.2.5.8 drops a tag the input ends inside, so neither stray end tag
		// builds the element it would have.
		expect(emitted["end-tag-p.html"]).not.toContain("<p");
		expect(emitted["end-tag-br.html"]).not.toContain("<br");
		// In a stylesheet the rule's `}` is written after a value the input left
		// open, and read inside it would lose the declaration — so it is closed.
		expect(emitted["css.html"]).toContain("<style>.a{--x:f()}</style>");
		expect(emitted["style-body.html"]).toContain(".a{--x:lab(50%)}");
		// A `style=""` list prints nothing after it, so it stays as written.
		expect(emitted["css.html"]).toContain("<div style=--x:lab(50%>");
		expect(emitted).toMatchSnapshot();
	}
};
