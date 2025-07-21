"use strict";

module.exports = [
	// Invalid fetchPriority value warning
	[
		/`webpackFetchPriority` expected "low", "high" or "auto", but received: invalid\./
	],
	// Both prefetch and preload specified
	[
		/Both webpackPrefetch and webpackPreload are specified\. webpackPreload will take precedence for immediate loading\./
	]
];
