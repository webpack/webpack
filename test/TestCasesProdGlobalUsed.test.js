"use strict";

const { describeCases, variants } = require("./templates/TestCases");

describe("TestCasesProdGlobalUsed", () => {
	describeCases(variants["production-global-used"]);
});
