"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["main.js"];
	},
	afterExecute(options) {
		const dir = options.output.path;
		const read = (file) => fs.readFileSync(path.join(dir, file), "utf8");
		// Only `main.js` runs here, so read what the pages would load.
		const pair = read("pair.js");
		expect(pair).toContain(".pairFirst = ");
		expect(pair).toContain(".pairSecond = ");
		for (const page of ["a.html", "b.html"]) {
			expect(read(page)).toMatch(/<script[^>]*src="pair\.js"/);
		}
	}
};
