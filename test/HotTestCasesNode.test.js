"use strict";

const { describeCases } = require("./templates/HotTestCases");

describe("HotTestCases", () => {
	describeCases({
		name: "node",
		target: "node"
	});
});
