"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		cssChunkFilename: "[name].chunk.css"
	},
	optimization: {
		chunkIds: "named"
	},
	module: {
		parser: {
			html: {
				sources: [
					"...",
					// Custom element whose `src` should bundle a classic
					// script entry, just like `<script src>`.
					{ tag: "my-script", attribute: "src", type: "script" },
					// Custom element whose `src` should bundle as an ES
					// module entry, like `<script type="module" src>`.
					{
						tag: "my-module",
						attribute: "src",
						type: "script-module"
					},
					// Custom element whose `href` should bundle a CSS
					// chunk entry, like `<link rel="stylesheet">`.
					{ tag: "my-link", attribute: "href", type: "stylesheet" },
					// Custom attribute whose value IS a full inline stylesheet
					// (like a `<style>` body) — routed through the CSS pipeline
					// and the attribute value replaced with the processed CSS.
					{
						tag: "my-style",
						attribute: "data-css",
						type: "stylesheet-style"
					},
					// Custom attribute whose value is a CSS block's contents (a
					// declaration list, like a `style` attribute) — also routed
					// through the CSS pipeline so `url()` & co. resolve.
					{
						tag: "my-box",
						attribute: "data-style",
						type: "stylesheet-style-attribute"
					},
					// Custom attribute whose value is a CSS value carrying a
					// `url(...)` FuncIRI (like an SVG `fill`) — the referenced
					// file is bundled as a plain asset and the url rewritten.
					{ tag: "my-paint", attribute: "data-fill", type: "css-url" },
					// Any-tag source (no `tag`): the `data-style` attribute is a
					// CSS block's contents on *any* element.
					{ attribute: "data-style", type: "stylesheet-style-attribute" }
				]
			}
		}
	},
	experiments: {
		html: true,
		css: true
	}
};
