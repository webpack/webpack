"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const page = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);

		// Every language the document nests, each reached by the minimizer that
		// claims it: the `<style>` and the `style=""` by webpack's CSS minifier,
		// the JSON `<script>` by `jsonMinify`, the `<svg>` subtree by the SVG
		// minifier the config supplies, and the `<iframe srcdoc>` by webpack's
		// HTML minifier over again. The whole serialization is the record.
		expect(page).toMatchSnapshot();
		// The two nothing could reach before: an inline `<script>` is terser's,
		// and an `<svg>` subtree is only ever a caller's.
		expect(page).toContain("<script>var a=1;function f(){return a}</script>");
		expect(page).toContain('<svg viewBox="0 0 2 2"> <rect fill=red /> </svg>');
	}
};
