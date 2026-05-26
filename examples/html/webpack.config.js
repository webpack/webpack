"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// `target: "web"` makes the CSS generator emit `.css` chunks (for the
	// `<link rel="stylesheet">` and the inline `<style>`).
	target: "web",
	entry: {
		// Only an HTML entry point — no JavaScript entry. Its stylesheet,
		// scripts (external and inline), inline style and images are all
		// discovered from the HTML and bundled, and `dist/index.html` is
		// emitted with every reference rewritten.
		page: "./src/index.html"
	},
	experiments: {
		html: true,
		css: true
	}
};

module.exports = config;
