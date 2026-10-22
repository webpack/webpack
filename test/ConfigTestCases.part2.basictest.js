"use strict";

const { describeCases } = require("./templates/ConfigTestCases");

// One of two files sharing the suite, so Jest runs them on separate workers.
describeCases({
	name: "ConfigTestCases",
	part: 2
});
