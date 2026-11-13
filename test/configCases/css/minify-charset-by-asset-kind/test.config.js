"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const [{ output }] = /** @type {import("../../../../").Configuration[]} */ (
			/** @type {unknown} */ (options)
		);
		const read = (/** @type {string} */ name) =>
			fs.readFileSync(
				path.join(
					/** @type {string} */ (
						/** @type {NonNullable<typeof output>} */ (output).path
					),
					name
				),
				"utf8"
			);
		// A stylesheet asset declares `@charset` whatever its name ends in.
		expect(read("bundle0.style")).toBe(
			'@charset "UTF-8";.a:after{content:"\u{1F903}"}'
		);
		// A `<style>` inside a `data:` URL is read in its document's encoding, so
		// only the stylesheet asset itself opens with `@charset`.
		const css = read("bundle1.css");
		expect(css.lastIndexOf("@charset")).toBe(0);
		expect(css).toMatchSnapshot();
	}
};
