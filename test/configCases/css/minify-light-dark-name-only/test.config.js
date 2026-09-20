"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "bundle0.css"),
			"utf8"
		);
		expect(css).toMatchSnapshot();

		// Nothing calls the function, so no pair and no defaulting rule.
		expect(css).not.toContain("--webpack-light");
		expect(css).not.toContain("--webpack-dark");
		expect(css).not.toContain(":where(:root)");
		expect(css).toContain(".scheme-light-dark{color-scheme:light dark}");
		expect(css).toContain("my-light-dark(1px)");
	}
};
