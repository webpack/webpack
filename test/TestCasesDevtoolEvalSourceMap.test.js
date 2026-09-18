"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-source-map",
		devtool: "eval-source-map"
	});
});
