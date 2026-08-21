"use strict";

module.exports = [
	[
		/split chunks capped: 'optimization\.splitChunks' refused these splits/,
		// `main` is initial only, so `maxInitialRequests` is what refused it.
		/cacheGroup 'vendor' out of main \(1 modules, maxInitialRequests is 1\)/
	]
];
