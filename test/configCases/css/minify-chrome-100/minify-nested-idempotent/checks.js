"use strict";

const fs = require("fs");
const path = require("path");
const cssMinify = require("../../../../../lib/css/cssMinify");

module.exports = {
	async afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "minify-nested-idempotent.css"),
			"utf8"
		);
		expect(css).toMatchSnapshot("minify-nested-idempotent");

		// What the printer wrote is what a second pass writes.
		const again = await cssMinify({ "minify-nested-idempotent.css": css }, undefined, {
			environment: { browsers: ["chrome 100"] }
		});
		expect(again.code).toBe(css);
	}
};
