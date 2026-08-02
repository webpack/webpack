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
		expect(
			fs.readFileSync(path.join(options.output.path, "page.html"), "utf8")
		).toMatchSnapshot();
	}
};
