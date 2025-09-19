"use strict";

module.exports = [
	// Invalid fetchPriority value warning
	[
		/`webpackFetchPriority` expected "low", "high" or "auto", but received: invalid\./
	],
	// Invalid preloadAs (non-string)
	[/`webpackPreloadAs` expected a string, but received: 123\./],
	// Invalid preloadType (non-string)
	[/`webpackPreloadType` expected a string, but received: 123\./],
	// Invalid preloadMedia (non-string)
	[/`webpackPreloadMedia` expected a string, but received: 456\./]
];
