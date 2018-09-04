const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "minimized-hashed-modules",
		mode: "production",
		minimize: true,
		optimization: {
			moduleIds: "hashed"
		}
	});
});
