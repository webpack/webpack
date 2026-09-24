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

		expect(css).toContain(".a>.child{top:0}");
		expect(css).toContain(".b+.next{top:1px}");
		expect(css).toContain(".c~.later{top:2px}");
		expect(css).toContain(".d>.child{top:3px}");
		expect(css).toContain(".e || .col{top:4px}");
		expect(css).toContain(".f .inside{top:5px}");
		expect(css).toContain(":is(.g,.h)>.child{top:6px}");
		expect(css).toContain(".i>.child{top:7px}");

		// The list reads in the order the written selectors settle on.
		expect(css).toContain(".j .z,.j+.y,.j>.x{left:0}");

		// What the printer wrote is what a second pass writes.
		const again = await cssMinify({ "bundle0.css": css }, undefined, {
			environment: { browsers: ["chrome 100"] }
		});
		expect(again.code).toBe(css);
	}
};
