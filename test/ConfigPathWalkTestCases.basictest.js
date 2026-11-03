"use strict";

const { describeCases } = require("./templates/ConfigTestCases");

// The parsing cases again, the program walked by node id: the internal switch
// the walk moves behind until it is the only walk.
describeCases({
	name: "ConfigPathWalkTestCases",
	categories: ["parsing"],
	pathWalk: true
});
