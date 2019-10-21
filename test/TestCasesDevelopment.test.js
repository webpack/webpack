const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "development",
		mode: "development",
		devtool: false
	});
});
