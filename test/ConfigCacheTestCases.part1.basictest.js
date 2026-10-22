"use strict";

const { describeCases } = require("./templates/ConfigTestCases");

// One of three files sharing the suite, so Jest runs them on separate workers.
describeCases({
	name: "ConfigCacheTestCases",
	part: 1,
	cache: {
		type: "filesystem",
		buildDependencies: {
			defaultWebpack: []
		}
	}
});
