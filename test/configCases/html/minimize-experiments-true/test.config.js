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

		// The branch under test: `experiments.html: true` is the explicit opt-in.
		expect(read("experiments.txt")).toBe(JSON.stringify(true));

		// Rendered by webpack itself.
		expect(read("page.html")).toContain("<!doctype html><html lang=en>");

		// Emitted by another plugin and unclaimed, so the built-in minifier takes
		// it too: the inert comment goes, and the `<%= title %>` placeholder
		// survives because text nodes serialize from their source bytes.
		const copied = read("copied.html");

		expect(copied).not.toContain("drop me");
		expect(copied).toContain("<div><%= title %></div>");

		// Already marked `minimized`, so a minimizer the user configured has
		// handled it — webpack must leave it exactly as it was.
		expect(read("already.html")).toBe(
			"<!DOCTYPE html>\n<html><body>\n<!-- keep me -->\n</body></html>\n"
		);
	}
};
