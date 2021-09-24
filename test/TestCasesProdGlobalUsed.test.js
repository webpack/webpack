const { describeCases } = require("./TestCases.template");

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
