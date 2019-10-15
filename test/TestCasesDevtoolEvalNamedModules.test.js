const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-named-modules",
		devtool: "eval",
		optimization: {
			moduleIds: "named",
			chunkIds: "named"
		}
	});
});
