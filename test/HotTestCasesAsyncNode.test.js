const { describeCases } = require("./HotTestCases.template");

describe("HotTestCases", () => {
	describeCases({
		name: "async-node",
		target: "async-node"
	});
});
