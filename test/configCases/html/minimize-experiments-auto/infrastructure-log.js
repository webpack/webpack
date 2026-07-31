"use strict";

// The copied asset comes from a plugin rather than the module graph, so the
// minimizer's cache entry for it is always written after the pack was built —
// the same pattern as `configCases/process-assets/html-plugin`.
module.exports = [
	/^Pack got invalid because of write to: TerserWebpackPlugin\|copied\.html$/
];
