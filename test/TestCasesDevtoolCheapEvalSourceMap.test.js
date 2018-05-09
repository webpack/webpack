const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-cheap-eval-source-map",
		devtool: "cheap-eval-source-map"
	});
});
