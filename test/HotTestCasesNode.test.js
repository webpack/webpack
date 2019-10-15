const { describeCases } = require("./HotTestCases.template");

describe("HotTestCases", () => {
	describeCases({
		name: "node",
		target: "node"
	});
});
