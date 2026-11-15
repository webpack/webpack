"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((compress) => ({
	target: "node",
	mode: "production",
	experiments: { futureDefaults: true },
	optimization: {
		minimize: {
			javascript: {
				compress,
				module: true,
				nameCache: { vars: { props: { $process: "cachedProcess" } } }
			}
		},
		minimizer: ["..."]
	}
}));
