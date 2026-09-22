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

		expect(css).toContain(".a .x,.a .y{top:0}");
		expect(css).toContain(".b .o,.b .p,.b .q{left:0}");
		expect(css).toContain(".c,.c .x,.c .y{right:0}");
		expect(css).toContain(".d{bottom:1px}.d .x,.d .y{bottom:0}");
		expect(css).toContain(".e .x{margin:0}.e .y{margin:1px}.e .z{margin:0}");
		expect(css).toContain("@media print{.f .x,.f .y{padding:0}}");
		expect(css).toContain(".g{top:0;.x{top:0}left:0}");

		// The rule a hoist wrote is a neighbor of what stands either side of it.
		expect(css).toContain(".h,.i .x{color:teal}");
		expect(css).toContain(".j .x,.k .y{outline-width:1px}");
		expect(css).toContain(".l,.m .x{outline-color:red}");
		expect(css).toContain(".n,.o,.o .x{order:3}");

		// What the printer wrote is what a second pass writes.
		const again = await cssMinify({ "bundle0.css": css }, undefined, {
			environment: { browsers: ["chrome 100"] }
		});
		expect(again.code).toBe(css);
	}
};
