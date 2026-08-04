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

		// A classic script is minified: its statements merge and the whitespace goes.
		expect(html).toContain(
			'<script>var greeting="hello",target="world";window.message=greeting+" "+target;</script>'
		);

		// A module is parsed as one, so its top-level binding may be renamed — and
		// the constant folds.
		expect(html).toContain(
			"<script type=module>window.moduleValue=42;</script>"
		);

		// Only script text is minified. A data block keeps its body, whatever it
		// looks like, and JSON goes through the JSON minifier instead.
		expect(html).toContain("var notScript = 1;");
		expect(html).toContain(
			'<script type=application/json>{"keep":"json"}</script>'
		);

		// A `</script>` the minified output would carry is escaped — the element
		// ends at the first one, so an unescaped one would cut the script short.
		expect(html).toContain('window.closer="<\\/script>"');

		// The minified scripts still run and produce what the source did.
		const window = /** @type {EXPECTED_ANY} */ ({});
		const context = vm.createContext({ window });
		for (const [, body] of html.matchAll(
			/<script(?![^>]*\btype=(?:application\/json|text\/template))[^>]*>([^]*?)<\/script>/g
		)) {
			vm.runInContext(body.replace(/<\\\//g, "</"), context, {
				// A module's `import`/`export` would need a real module record; these
				// bodies have neither, so the script goal runs them.
				filename: "inline.js"
			});
		}
		expect(window.message).toBe("hello world");
		expect(window.moduleValue).toBe(42);
		expect(window.closer).toBe("</script>");
	}
};
