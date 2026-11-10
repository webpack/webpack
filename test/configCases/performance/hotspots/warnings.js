"use strict";

module.exports = [
	[
		// A slow runner can stall another tap past the threshold, so the count
		// and the other entries are not pinned, only BurnPlugin's own.
		/hotspots: \d+ things? holds? the main thread long enough to be worth looking at/,
		// The exact figure is a measurement, so only the shape is pinned.
		/\n {2}plugin BurnPlugin \(\d+ ms over \d+ runs?\)/,
		/The same time, grouped by the hook it ran under:(\n {2}\w+ \(\d+ ms\))*\n {2}afterSeal \(\d+ ms\)/
	]
];
