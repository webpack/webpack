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
		// A `<style>` inside a `data:` URL document is read in that document's
		// encoding; a `data:text/css` URL is a stylesheet of its own.
		const css = read("bundle1.css");
		const charsets = css.split('@charset \\"UTF-8\\";').length - 1;
		expect(css.startsWith('@charset "UTF-8";')).toBe(true);
		expect(css).toContain('url("data:text/css,@charset \\"UTF-8\\";.g');
		expect(charsets).toBe(1);
		expect(css).toMatchSnapshot();
	}
};
