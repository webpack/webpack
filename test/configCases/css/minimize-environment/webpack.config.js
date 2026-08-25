"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Chrome 50 predates every CSS ability the printer reaches for, so the
	// selection alone is what holds each spelling back. The default minimizer
	// wiring resolves it and passes it to `cssMinify`, so the whole option flow is
	// exercised rather than the serializer alone.
	target: "browserslist: chrome 50",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: true,
		// `"..."` keeps the default minimizer, which is what resolves the target
		// and hands its browsers to `cssMinify`.
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
