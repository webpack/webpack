"use strict";

// A resource hint on a worker fires its `<link>` from the chunk's startup runtime,
// which names the same file the `new Worker(new URL(...))` call site does — so the
// public path and the chunk-filename map stay out of the bundle.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	experiments: {
		outputModule: true
	}
};
