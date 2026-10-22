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

		// One block, holding both bodies in the order they were written: the layer
		// is one layer, and where it sits is where it was first named.
		expect(css.match(/@layer a\{/g)).toHaveLength(1);
		expect(css).toContain("@layer app{@layer a{.first{top:0}.f0{top:1px}");
		expect(css).toContain(".f3399{top:3400px}.last{bottom:0}}}");

		// A layer named once is left alone, whatever stands around it.
		expect(css).toContain("@layer solo{.kept{left:0}}");
		expect(css).toContain("@layer other{.elsewhere{right:0}}");

		// Which blocks gather does not turn on whether one was small enough to
		// assemble, so what the printer wrote is what a second pass writes.
		const again = await cssMinify({ "bundle0.css": css });
		expect(again.code).toBe(css);
	}
};
