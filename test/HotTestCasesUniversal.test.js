"use strict";

const { describeCases } = require("./HotTestCases.template");

describe("HotTestCases", () => {
	describeCases({
		name: "universal",
		target: ["web", "node"]
	});
});
