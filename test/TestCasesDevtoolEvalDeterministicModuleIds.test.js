"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-deterministic-module-ids",
		devtool: "eval",
		optimization: {
			moduleIds: "deterministic"
		}
	});
});
