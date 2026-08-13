"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// A browserslist target so the default minimizer wiring resolves its browser
	// list and hands it to `cssMinify` — the whole option flow, not the
	// serializer alone. Exact versions in `.browserslistrc` keep the snapshot
	// stable as caniuse updates.
	target: "browserslist",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: true,
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
