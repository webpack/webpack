"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "minimized-source-map",
		mode: "production",
		devtool: "eval-cheap-module-source-map",
		minimize: true
	});
});
