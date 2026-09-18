"use strict";

const { describeCases } = require("./templates/HotTestCases");

describe("HotTestCases", () => {
	describeCases({
		name: "webworker",
		target: "webworker"
	});
});
