"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval",
		devtool: "eval"
	});
});
