"use strict";

const fs = require("fs");
const path = require("path");
const cssMinify = require("../../../../lib/css/cssMinify");

module.exports = {
	async afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "bundle0.css"),
			"utf8"
		);
		expect(css).toMatchSnapshot();

		// The empty value carries no space: a second pass takes one off, and all
		// three engines read either spelling as nothing.
		expect(css).toContain("--webpack-dark:}");
		expect(css).not.toContain("--webpack-dark: ");
		expect(css).toContain("--webpack-light:;");
		// The block stating the scheme carries the toggle, and the pair is written
		// there once.
		expect(css).toContain("color-scheme:light dark;--own:1;--webpack-light:");
		// Three: the block stating the scheme, the one that already carried the
		// pair, and the defaulting rule — never a fourth from re-reading one.
		expect(css.match(/--webpack-light:initial/g)).toHaveLength(3);
		// A class whose name holds the same text as the function turns nothing on.
		expect(css).toContain(".scheme-light-dark{color:red}");

		// A second pass over this output has nothing left to take.
		const again = await cssMinify(
			{ "bundle0.css": css },
			{ environment: { browsers: ["chrome 100"] } }
		);
		expect(again.code).toBe(css);
	}
};
