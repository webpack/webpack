const { describeCases } = require("./HotTestCases.template");

describe("HotTestCases", () => {
	describeCases({
		name: "webworker",
		target: "webworker"
	});
});
