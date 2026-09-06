"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	// universal target: the same bundle renders on the server and hydrates on the client
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	// implied by the universal target, but the harness reads the raw config to
	// decide whether to emit (and run) the bundle as `.mjs`
	experiments: {
		outputModule: true
	},
	plugins: [new SSRManifestPlugin()]
};
