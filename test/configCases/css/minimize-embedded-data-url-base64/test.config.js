"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "bundle0.css"),
			"utf8"
		);

		expect(css).toMatchSnapshot();

		// A payload reached through base64 is minified like any other, and stays
		// base64: re-encoding it as text would be a different url.
		for (const language of [
			"image/svg+xml",
			"text/css",
			"text/html",
			"application/json",
			"text/javascript"
		]) {
			expect(css).toContain(`data:${language};base64,`);
		}
	}
};
