const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-deterministic-module-ids",
		devtool: "eval",
		optimization: {
			moduleIds: "deterministic"
		}
	});
});
