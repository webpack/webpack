"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "devtool-source-map",
		devtool: "source-map"
	});
});
