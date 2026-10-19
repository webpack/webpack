"use strict";

module.exports = [
	[
		// A slow runner can stall another tap past the threshold, so the count
		// and the other entries are not pinned, only BurnPlugin's own.
		/hotspots: \d+ things? holds? the main thread long enough to be worth looking at/,
		/\n {2}plugin BurnPlugin \(\d+ ms over \d+ runs?\)/
	]
];
