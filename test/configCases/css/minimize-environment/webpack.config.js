"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false,
		// The default minimizer wiring reads this and passes it to `cssMinify`, so
		// the whole option flow is exercised rather than the serializer alone.
		environment: {
			cssColorHexAlpha: false,
			cssInsetShorthand: false,
			cssMediaQueryRange: false
		}
	},
	optimization: {
		minimize: true,
		// `"..."` keeps the default minimizer, which is what reads
		// `output.environment` and hands it to `cssMinify`.
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
