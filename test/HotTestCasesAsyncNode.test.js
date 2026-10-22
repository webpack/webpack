"use strict";

const { describeCases, variants } = require("./templates/HotTestCases");

describe("HotTestCases", () => {
	describeCases(variants["async-node"]);
});
