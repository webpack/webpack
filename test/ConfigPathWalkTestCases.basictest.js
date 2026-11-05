"use strict";

const { describeCases } = require("./templates/ConfigTestCases");

// The parsing cases again, every node walked as its ESTree object: the walk
// the internal switch turns back to, which the id walk falls back to per node.
describeCases({
	name: "ConfigPathWalkTestCases",
	categories: ["parsing"],
	pathWalk: false
});
