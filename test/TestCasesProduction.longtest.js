const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "production",
		mode: "production",
		minimize: true
	});
});
