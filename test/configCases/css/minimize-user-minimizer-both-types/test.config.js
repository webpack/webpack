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
		const read = (name) =>
			fs.readFileSync(path.join(options.output.path, name), "utf8");

		// Both reach the configured minimizer unminified — the marker is there and
		// the source line breaks survive, so neither built-in minifier ran.
		const css = read("main.css");
		const html = read("page.html");

		expect(css.startsWith("/*u*/")).toBe(true);
		expect(css).toContain("\n");
		expect(html.startsWith("<!--u-->")).toBe(true);
		expect(html).toContain("\n  <body>");
	}
};
