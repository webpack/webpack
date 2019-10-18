const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-cheap-source-map",
		devtool: "eval-cheap-source-map"
	});
});
