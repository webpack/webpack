const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "minimized-source-map",
		mode: "production",
		devtool: "cheap-module-eval-source-map",
		minimize: true
	});
});
