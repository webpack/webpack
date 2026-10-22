"use strict";

const { describeCases, variants } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases(variants["all-combined"]);
});
