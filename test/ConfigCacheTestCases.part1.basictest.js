"use strict";

const { describeCases } = require("./templates/ConfigTestCases");

describeCases({
	name: "ConfigCacheTestCases",
	part: [1, 3],
	cache: {
		type: "filesystem",
		buildDependencies: {
			defaultWebpack: []
		}
	}
});
