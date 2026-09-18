"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-cheap-module-source-map",
		devtool: "eval-cheap-module-source-map"
	});
});
