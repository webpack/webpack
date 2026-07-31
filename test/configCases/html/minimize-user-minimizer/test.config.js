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

		// Both pages reach the configured minimizer unminified: the marker is
		// there, the copied file is byte-identical behind it, and webpack's own
		// page still has its source line breaks — the built-in never ran.
		const own = read("page.html");

		expect(own.startsWith("<!--user-->")).toBe(true);
		expect(own).toContain("\n");
		expect(read("copied.html")).toBe(
			"<!--user--><!DOCTYPE html>\n<html><body>\n<!-- keep me -->\n</body></html>\n"
		);
	}
};
