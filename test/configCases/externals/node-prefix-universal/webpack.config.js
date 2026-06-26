"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// universal bundle (node + web, ESM): may run on deno/bun, which require the
	// `node:` specifier to resolve a core module
	target: ["node18", "web"],
	output: { module: true },
	experiments: { outputModule: true }
};
