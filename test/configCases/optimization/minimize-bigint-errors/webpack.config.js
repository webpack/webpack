"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = ["./unary.js", "./remainder.js"].map((entry) => ({
	entry,
	target: "node",
	mode: "production",
	experiments: { futureDefaults: true },
	optimization: {
		minimize: true,
		minimizer: ["..."]
	}
}));
