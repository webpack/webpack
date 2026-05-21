"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	module: {
		parser: {
			html: {
				// An array without `"..."` opts out of the default source list.
				// Only `<img data-src>` is extracted as a webpack dependency;
				// `<img src>`, `<link href>`, `<script src>` etc. are left
				// untouched and `<script src>` no longer becomes a chunk
				// entry — so referencing a missing `./entry.js` must not
				// cause a compilation error.
				sources: [{ tag: "img", attribute: "data-src", type: "src" }]
			}
		}
	},
	experiments: {
		html: true
	}
};
