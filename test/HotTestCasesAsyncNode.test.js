"use strict";

const { describeCases } = require("./templates/HotTestCases");

describe("HotTestCases", () => {
	describeCases({
		name: "async-node",
		target: "async-node"
	});
});
