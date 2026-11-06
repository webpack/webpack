"use strict";

const path = require("path");

// `over-limit.json` sits just past the depth limit, which every engine's
// JSON.parse reads, so only webpack's own check can reject it.
/** @type {Record<string, number>} */
const DEPTHS = { "deep.json": 10000, "over-limit.json": 600 };

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function deepLoader() {
	const depth = DEPTHS[path.basename(this.resourcePath)];
	return `${'{"a":'.repeat(depth)}1${"}".repeat(depth)}`;
};
