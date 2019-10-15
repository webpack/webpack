const { describeCases } = require("./HotTestCases.template");

describe("HotTestCases", () => {
	describeCases({
		name: "web",
		target: "web"
	});
});
