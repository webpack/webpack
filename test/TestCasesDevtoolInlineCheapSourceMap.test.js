"use strict";

const { describeCases, variants } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases(variants["devtool-inline-cheap-source-map"]);
});
