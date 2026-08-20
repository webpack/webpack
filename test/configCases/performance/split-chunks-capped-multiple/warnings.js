"use strict";

module.exports = [
	[
		/split chunks capped: 'optimization\.splitChunks' refused these splits/,
		// Equal module counts, so only the cache-group tie-break puts these in a
		// stable order.
		/cacheGroup 'alpha' out of main \(1 modules[^\n]*\n {2}cacheGroup 'zebra' /
	]
];
