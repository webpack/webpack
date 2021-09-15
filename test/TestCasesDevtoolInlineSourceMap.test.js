const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-inline-source-map",
		devtool: "inline-source-map"
	});
});
