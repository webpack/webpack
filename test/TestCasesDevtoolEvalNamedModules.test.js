"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-named-modules",
		devtool: "eval",
		optimization: {
			moduleIds: "named",
			chunkIds: "named"
		}
	});
});
