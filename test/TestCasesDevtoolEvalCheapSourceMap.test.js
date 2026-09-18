"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-cheap-source-map",
		devtool: "eval-cheap-source-map"
	});
});
