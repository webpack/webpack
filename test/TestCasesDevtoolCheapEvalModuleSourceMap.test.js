const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-cheap-eval-module-source-map",
		devtool: "cheap-module-eval-source-map"
	});
});
