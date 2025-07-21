"use strict";

module.exports = [
	// Numeric prefetch value (not boolean)
	[/`webpackPrefetch` expected true, but received: 10\./],
	// Negative prefetch value
	[/`webpackPrefetch` expected true, but received: -1\./],
	// Invalid fetch priority
	[
		/`webpackFetchPriority` expected "low", "high" or "auto", but received: invalid\./
	],
	// Both prefetch and preload specified
	[
		/Both webpackPrefetch and webpackPreload are specified\. webpackPreload will take precedence for immediate loading\./
	]
];
