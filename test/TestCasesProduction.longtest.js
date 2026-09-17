"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "production",
		mode: "production",
		minimize: true
	});
});
