"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "devtool-inline-source-map",
		devtool: "inline-source-map"
	});
});
