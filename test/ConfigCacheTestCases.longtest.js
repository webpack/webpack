const { describeCases } = require("./ConfigTestCases.template");

describeCases({
	name: "ConfigCacheTestCases",
	cache: {
		type: "filesystem",
		buildDependencies: {
			defaultWebpack: []
		}
	}
});
