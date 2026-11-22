"use strict";

const { describeCases } = require("./templates/WatchTestCases");

describeCases({
	name: "WatchCacheUnaffectedTestCases",
	experiments: {
		cacheUnaffected: true
	}
});
