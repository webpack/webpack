module.exports = [
	// Negative prefetch value
	[/`webpackPrefetch` order must be non-negative, but received: -1\./],
	// Invalid fetch priority
	[
		/`webpackFetchPriority` expected "low", "high" or "auto", but received: invalid\./
	],
	// Both prefetch and preload specified
	[
		/Both webpackPrefetch and webpackPreload are specified\. webpackPreload will take precedence for immediate loading\./
	]
];
