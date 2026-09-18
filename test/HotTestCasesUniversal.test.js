"use strict";

const { describeCases } = require("./templates/HotTestCases");

describe("HotTestCases", () => {
	describeCases({
		name: "universal",
		target: ["web", "node"]
	});
});
