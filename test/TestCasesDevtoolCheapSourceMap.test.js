const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-cheap-source-map",
		devtool: "cheap-source-map"
	});
});
