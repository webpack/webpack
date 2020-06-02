const path = require("path");
const { describeCases } = require("./ConfigTestCases.template");

describeCases({
	name: "ConfigCacheTestCases",
	cache: {
		type: "filesystem",
		managedPaths: [path.resolve(__dirname, "../node_modules")]
	}
});
