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

		// All three lose the declaration written over, so all three print the one
		// block and are written as the one rule they are.
		expect(css).toContain(
			".a,.b,.c{text-decoration:underline;text-decoration-style:dotted}"
		);
		expect(css).toContain(
			".d{& i{top:0}text-decoration:underline;text-decoration-style:dotted}"
		);
		expect(css).toContain(".e{text-decoration:overline!important;");
		expect(css).toContain(".f{text-decoration-line:underline;");
		expect(css).toContain(
			".g{text-decoration:overline;text-decoration:var(--x)}"
		);

		const again = await cssMinify({ "bundle0.css": css }, undefined, {
			environment: { browsers: ["safari 15"] }
		});
		expect(again.code).toBe(css);
	}
};
