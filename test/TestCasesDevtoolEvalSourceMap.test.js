const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-source-map",
		devtool: "eval-source-map"
	});
});
