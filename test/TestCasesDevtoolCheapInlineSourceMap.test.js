const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-cheap-inline-source-map",
		devtool: "cheap-inline-source-map"
	});
});
