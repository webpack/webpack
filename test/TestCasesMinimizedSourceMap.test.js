const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "minimized-source-map",
		mode: "production",
		devtool: "eval-cheap-module-source-map",
		minimize: true
	});
});
