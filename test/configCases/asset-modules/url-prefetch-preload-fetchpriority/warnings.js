"use strict";

module.exports = [
	// Invalid fetchPriority value warning
	[
		/`webpackFetchPriority` expected "low", "high" or "auto", but received: invalid\./
	],
	// Invalid webpackPreloadType value warning
	[/`webpackPreloadType` expected a string, but received: 123\./]
];
