"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "development",
		mode: "development",
		devtool: false
	});
});
