"use strict";

module.exports = [
	// Invalid fetchPriority value warning
	[
		/`webpackFetchPriority` expected "low", "high" or "auto", but received: invalid\./
	],
	// Invalid preloadAs value
	[/`webpackPreloadAs` expected one of \[.*\], but received: invalid-as\./],
	// Invalid preloadType (non-string)
	[/`webpackPreloadType` expected a string, but received: 123\./],
	// Invalid preloadMedia (non-string)
	[/`webpackPreloadMedia` expected a string, but received: 456\./]
];
