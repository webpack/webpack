"use strict";

module.exports = [
	[/`webpackPrefetch` expected true, but received: 3\./],
	[/`webpackPreload` expected true, but received: false\./],
	[
		/`webpackFetchPriority` expected "low", "high" or "auto", but received: urgent\./
	],
	[/`webpackAs` expected a string, but received: 123\./],
	[/`webpackType` expected a string, but received: 123\./],
	[/`webpackMedia` expected a string, but received: 456\./]
];
