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
					// Custom attribute whose value IS inline CSS text —
					// gets routed through the CSS pipeline and the
					// attribute value is replaced with the processed CSS.
					{
						tag: "my-style",
						attribute: "data-css",
						type: "stylesheet-inline"
					}
				]
			}
		}
	},
	experiments: {
		html: true,
		css: true
	}
};
