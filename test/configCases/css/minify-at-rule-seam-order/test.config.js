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

		// Every at-rule whose block holds rules reaches the same seam, so each is
		// held to the printer's own order rather than the order the two were in.
		expect(css).toContain("@media print{.a,.b{color:red}}");
		expect(css).toContain("@supports (color:red){.c,.d{top:0}}");
		expect(css).toContain("@layer named{.e,.f{left:0}}");
		expect(css).toContain("@starting-style{.g,.h{opacity:0}}");
		// A run of joins ends in one list, ordered once the sheet leaves nothing
		// further to append.
		expect(css).toContain("@container (width>0px){.s1,.s2,.s3,.s4{right:0}}");
		// A seam that joins nothing leaves both rules where they were written.
		expect(css).toContain(
			"@media screen{.keep-first{color:red}.keep-second{color:blue}}"
		);

		// What the printer wrote is what a second pass writes.
		const again = await cssMinify({ "bundle0.css": css });
		expect(again.code).toBe(css);
	}
};
