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

		// Rendered by `HtmlModulesPlugin`, so it carries the `html` asset-info
		// marker and the built-in minifier claims it.
		expect(read("page.html")).toContain('<!DOCTYPE html><html lang="en">');

		// Emitted by another plugin: webpack never parsed it, so it must survive
		// byte-for-byte — re-serializing it would escape the `<%= title %>`
		// placeholder and rewrite the markup.
		expect(read("foreign.html")).toBe(
			"<!DOCTYPE html>\n<html>\n  <body>\n    <div>   <%= title %>   </div>\n  </body>\n</html>\n"
		);
	}
};
