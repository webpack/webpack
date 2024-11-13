const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-source-map-debugids",
		devtool: "source-map-debugids"
	});
});
