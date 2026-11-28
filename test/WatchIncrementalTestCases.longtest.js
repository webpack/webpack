"use strict";

const { describeCases } = require("./templates/WatchTestCases");

describeCases({
	name: "WatchIncrementalTestCases",
	incremental: true,
	optimization: {
		sideEffects: false,
		concatenateModules: false
	}
});
