"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	optimization: {
		// Off by default: a differently-spelled pair is usually a fallback.
		minimize: { css: { dropOverriddenDeclarations: true } },
		minimizer: ["..."]
	},
	experiments: { css: true }
};
