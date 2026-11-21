"use strict";

const { describeCases } = require("./templates/WatchTestCases");

describeCases({
	name: "WatchCacheUnaffectedTestCases",
	part: [1, 2],
	experiments: {
		cacheUnaffected: true
	}
});
