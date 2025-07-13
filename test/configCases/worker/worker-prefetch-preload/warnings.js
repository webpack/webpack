module.exports = [
	// Test for negative prefetch values
	[/`webpackPrefetch` order must be non-negative, but received: -1\./],
	// Test for invalid fetchPriority values
	[
		/`webpackFetchPriority` expected "low", "high" or "auto", but received: invalid\./
	],
	// Test for both prefetch and preload specified
	[
		/Both webpackPrefetch and webpackPreload are specified\. webpackPreload will take precedence/
	]
];
