"use strict";

const { describeCases } = require("./WatchTestCases.template");

describeCases({
	name: "WatchIncrementalTestCases",
	experiments: {
		incremental: true
	}
});
