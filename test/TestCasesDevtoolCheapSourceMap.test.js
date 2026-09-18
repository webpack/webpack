"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "devtool-cheap-source-map",
		devtool: "cheap-source-map"
	});
});
