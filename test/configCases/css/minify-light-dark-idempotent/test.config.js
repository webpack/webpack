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
		// Four: the two blocks stating the scheme, the one that already carried the
		// pair, and the defaulting rule — never a fifth from re-reading one.
		expect(css.match(/--webpack-light:initial/g)).toHaveLength(4);
		// A class whose name holds the same text as the function turns nothing on.
		expect(css).toContain(".scheme-light-dark{color:red}");
		// An authored `--webpack-light` is the author's, so the toggle still goes in.
		expect(css).toContain(
			".authored{color-scheme:light dark;--webpack-light:red;"
		);
		// A shouted call is the same call.
		expect(css).toContain(".shouted{color:var(--webpack-light,#abc)");

		// A second pass over this output has nothing left to take.
		const again = await cssMinify({ "bundle0.css": css }, undefined, {
			environment: { browsers: ["chrome 100"] }
		});
		expect(again.code).toBe(css);
	}
};
