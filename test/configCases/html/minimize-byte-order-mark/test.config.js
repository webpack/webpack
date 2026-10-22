"use strict";

const fs = require("fs");
const path = require("path");

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
		// The mark still names the encoding, and the doctype after it keeps the
		// page out of quirks mode.
		expect(html.startsWith("﻿<!doctype html>")).toBe(true);
		expect(html).toContain("<title>byte order mark</title>");
	}
};
