"use strict";

module.exports = [
	[
		/hotspots: 1 thing holds the main thread long enough to be worth looking at/,
		// The exact figure is a measurement, so only the shape is pinned.
		/\n {2}plugin BurnPlugin \(\d+ ms over \d+ runs?\)/,
		/The same time, grouped by the hook it ran under:\n {2}afterSeal \(\d+ ms\)/
	]
];
