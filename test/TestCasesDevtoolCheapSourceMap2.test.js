const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-object-notation-cheap-source-map",
		devtool: {
			type: "cheap-source-map"
		}
	});
});
