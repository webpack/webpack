"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	module: {
		parser: {
			html: {
				// An array without `"..."` opts out of the default source list, so only
				// `<img data-src>` becomes a webpack dependency. `<script src>` no longer becomes
				// a chunk entry, so the missing `./entry.js` must not fail the build.
				sources: [{ tag: "img", attribute: "data-src", type: "src" }]
			}
		}
	},
	experiments: {
		html: true
	}
};
