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
		// A comment in an SVG `<style>` is a comment node, not CSS: the URL inside
		// it is neither resolved nor rewritten, and it is kept after the sheet.
		expect(page).toContain(
			"<svg><style>.a{color:red}.c{color:blue}<!--.b{background:url(./marker.txt)}--></style></svg>"
		);
		// A template delimiter the source kept escaped stays escaped.
		expect(page).toContain('srcdoc="<p>&lt;%= a %> &#123;&#123; b }}</p>"');
		expect(page).toContain(
			"--c:&#39;&lt;%= c %>&#39;; --d:&#39;&#123;&#123;d}}&#39;"
		);
		expect(page).not.toMatch(/<%|\{\{/);
	}
};
