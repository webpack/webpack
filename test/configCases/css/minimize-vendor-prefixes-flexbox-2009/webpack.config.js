"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// A browserslist target, so the whole option flow runs rather than the
	// serializer alone. Exact versions keep the snapshot stable as caniuse moves.
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
