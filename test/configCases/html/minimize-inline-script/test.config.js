"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

		expect(html).toContain(
			'<script>var greeting="hello",target="world";window.message=greeting+" "+target;</script>'
		);
		// A module is parsed as one, so its top-level binding may be renamed.
		expect(html).toContain(
			"<script type=module>window.moduleValue=42;</script>"
		);
		// A data block keeps its body; JSON goes through the JSON minifier instead.
		expect(html).toContain("var notScript = 1;");
		expect(html).toContain(
			'<script type=application/json>{"keep":"json"}</script>'
		);
		// The element ends at the first `</script>`, so one in the output is escaped.
		expect(html).toContain('window.closer="<\\/script>"');

		// The minified scripts still run and produce what the source did.
		const window = /** @type {EXPECTED_ANY} */ ({});
		const context = vm.createContext({ window });
		for (const [, body] of html.matchAll(
			/<script(?![^>]*\btype=(?:application\/json|text\/template))[^>]*>([^]*?)<\/script>/g
		)) {
			vm.runInContext(body.replace(/<\\\//g, "</"), context, {
				filename: "inline.js"
			});
		}
		expect(window.message).toBe("hello world");
		expect(window.moduleValue).toBe(42);
		expect(window.closer).toBe("</script>");
	}
};
