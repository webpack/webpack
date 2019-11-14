const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-cheap-module-source-map",
		devtool: "eval-cheap-module-source-map"
	});
});
