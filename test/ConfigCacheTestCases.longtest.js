const path = require("path");
const { describeCases } = require("./ConfigTestCases.template");

describeCases({
	name: "ConfigCacheTestCases",
	cache: {
		type: "filesystem",
		buildDependencies: {
			defaultWebpack: []
		}
	},
	snapshot: {
		managedPaths: [path.resolve(__dirname, "../node_modules")]
	}
});
