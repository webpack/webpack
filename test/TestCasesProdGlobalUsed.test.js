"use strict";

const { describeCases } = require("./templates/TestCases");

describe("TestCasesProdGlobalUsed", () => {
	describeCases({
		name: "production with usedExports global",
		mode: "production",
		optimization: {
			usedExports: "global",
			minimize: false
		}
	});
});
