const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-source-map",
		devtool: "source-map"
	});
});
