"use strict";

module.exports = [
	[
		/slow plugins: 1 plugin holds the main thread long enough to be worth looking at/,
		// The exact figure is a measurement, so only the shape is pinned.
		/\n {2}BurnPlugin \(\d+ ms over \d+ calls?\)/
	]
];
