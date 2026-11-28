"use strict";

const { describeCases } = require("./templates/WatchTestCases");

describeCases({
	name: "WatchNonIncrementalTestCases",
	incremental: false,
	optimization: {
		sideEffects: false,
		concatenateModules: false
	}
});
