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
		const page = path.join(options.output.path, "page.html");
		const html = fs.readFileSync(page, "utf8");
		// Closed with the quote a string written out in full would have got, not
		// the one the source opened with.
		expect(html).toContain('content:"a"');
		expect(html).toContain('content:"b"');
		expect(html).toContain('content:"c"');
		// Which is what makes the output a fixed point: closing it with the
		// source's quote left a second pass to normalize it.
		const again = await htmlMinify({ "page.html": html });
		expect(again.code).toBe(html);
		expect(html).toMatchSnapshot();
	}
};
