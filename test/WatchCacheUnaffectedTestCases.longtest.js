const { describeCases } = require("./WatchTestCases.template");

describeCases({
	name: "WatchCacheUnaffectedTestCases",
	experiments: {
		cacheUnaffected: true
	}
});
