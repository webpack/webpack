"use strict";

// `output.html.csp` emits a `<meta http-equiv="Content-Security-Policy">` into
// every webpack-generated HTML page. Combined with `output.html.inline`, the
// build's scripts/styles end up inline in the page and CSP hashes each one
// (after inlining, so the sha256 matches the exact bytes the browser runs) on
// top of a strict baseline — no separate CSP plugin needed.
/** @type {import("../../").Configuration} */
module.exports = {
	entry: { index: "./src/index.html" },
	output: {
		html: {
			// Inline every emitted chunk into the page, so there are inline
			// `<script>`/`<style>` tags for CSP to hash. `"script"`/`"style"` or a
			// `RegExp` list narrow this; anything left external is covered by 'self'.
			inline: true,
			// `true` = strict baseline (`script-src`/`style-src 'self'`,
			// `object-src 'none'`, `base-uri 'self'`) plus a sha256 of each inline
			// script/style. An object can add a `nonce` or override directives via
			// `policy` (e.g. `{ policy: { "img-src": ["'self'", "data:"] } }`).
			csp: true
		}
	},
	experiments: { html: true }
};
