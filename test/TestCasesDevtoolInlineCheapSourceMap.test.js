"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "devtool-inline-cheap-source-map",
		devtool: "inline-cheap-source-map"
	});
});
