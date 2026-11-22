"use strict";

const { describeCases } = require("./templates/ConfigTestCases");

describeCases({
	name: "ConfigCacheTestCases",
	cache: {
		type: "filesystem",
		buildDependencies: {
			defaultWebpack: []
		}
	}
});
