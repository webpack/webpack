"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		// The HTML serialize keeps text whitespace, so the emitted page stays
		// line-per-source-line and the snapshot diffs one tag at a time.
		const page = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);
		const condition = /\{% if (\w+) %\} required\{% endif %\}/.exec(page);
		expect(condition && condition[1]).toBe("isRequired");
		expect(page).toMatchSnapshot();

		// An `&` keeps its escape only where the tokenizer would read on into a
		// reference: `copy` is a name the table holds even without the `;`, and
		// `#` opens a numeric one.
		expect(page).toContain('data-keep="&amp;copy x"');
		expect(page).toContain("data-num=&amp;#38;");
		// Every other `&` is data, so it costs nothing to write — which is the
		// query string every `href` carries.
		expect(page).toContain("data-bare=&zz");
		expect(page).toContain('data-query="x?a=1&b=2"');
	}
};
