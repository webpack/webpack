"use strict";

const { describeCases } = require("./templates/WatchTestCases");

describeCases({
	name: "WatchCacheUnaffectedTestCases",
	part: [2, 2],
	experiments: {
		cacheUnaffected: true
	}
});
