"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// `target: "web"` makes the CSS generator emit `.css` chunks (for the
	// `<link rel="stylesheet">` and the inline `<style>`).
	target: "web",
	entry: {
		// HTML entry point: emitted as a standalone `dist/page.html` with all
		// of its `<link>`, `<script>`, `<img>` and inline `<script>`/`<style>`
		// references bundled and rewritten.
		page: "./src/index.html",
		// JavaScript entry that imports an HTML module as a string.
		app: "./src/app.js"
	},
	experiments: {
		html: true,
		css: true
	}
};

module.exports = config;
