"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { pathinfo: false },
	optimization: { minimize: true, minimizer: ["..."] },
	experiments: { html: true }
};
