"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "bundle0.css"),
			"utf8"
		);
		// The newline is what ended each bad-string token, so it has to survive:
		// without it the string closes and the declaration an engine dropped runs.
		for (const bad of ['"tes', '"x\\"', 'url("']) {
			const at = css.indexOf(bad);
			expect(at).not.toBe(-1);
			expect(css[at + bad.length]).toBe("\n");
		}
		expect(css).toMatchSnapshot();
	}
};
