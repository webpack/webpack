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

		// What the printer wrote is what a second pass writes.
		const again = await cssMinify({ "bundle0.css": css }, undefined, {
			environment: { browsers: ["chrome 100"] }
		});
		expect(again.code).toBe(css);
	}
};
