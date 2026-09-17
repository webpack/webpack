"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const page = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);

		// Every language the document nests, each reached by the minimizer that claims it:
		// CSS for the `<style>` and `style=""`, `jsonMinify` for the JSON `<script>`, the
		// config's SVG minifier, and webpack's HTML minifier for the `<iframe srcdoc>`.
		expect(page).toMatchSnapshot();
		// The two nothing could reach before: an inline `<script>` is terser's,
		// and an `<svg>` subtree is only ever a caller's.
		expect(page).toContain("<script>var a=1;function f(){return a}</script>");
		expect(page).toContain('<svg viewBox="0 0 2 2"> <rect fill=red /> </svg>');
	}
};
