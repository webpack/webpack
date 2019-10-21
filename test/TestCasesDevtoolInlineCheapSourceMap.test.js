const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-inline-cheap-source-map",
		devtool: "inline-cheap-source-map"
	});
});
