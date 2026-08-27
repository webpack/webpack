"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const emitted = path.join(options.output.path, "page.html");
		const minified = fs.readFileSync(emitted, "utf8");
		// An `<svg>` prints as a marker for the renderer to answer, and this
		// document fosters, so the round-trip guard reads the print back: it has
		// to put the marker back or hand the whole document over unminified.
		expect(minified).toMatchSnapshot();
		expect(minified).not.toBe(
			fs.readFileSync(path.join(__dirname, "page.html"), "utf8")
		);
	}
};
