"use strict";

module.exports = [
	[
		/hotspots: \d+ things hold the main thread long enough to be worth looking at/,
		// The slower one is named first; the figures are measurements, so only
		// their shape is pinned.
		/plugin SlowSealPlugin \(\d+ ms over \d+ runs?\)[\s\S]*plugin SlowModulesPlugin \(\d+ ms over \d+ runs?\)/,
		/The same time, grouped by the hook it ran under:[\s\S]*afterSeal \(\d+ ms\)[\s\S]*optimizeModules \(\d+ ms\)/
	]
];
