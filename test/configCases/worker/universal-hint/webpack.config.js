"use strict";

// A worker's hint fires its `<link>` from chunk startup, naming the same file the
// call site does — so the public path and chunk-filename map stay out of the bundle.

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: { module: true },
	target: ["web", "node"]
};
