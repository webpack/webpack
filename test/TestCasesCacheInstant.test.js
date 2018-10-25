const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "cache instant",
		cache: {
			type: "filesystem",
			store: "instant"
		}
	});
});
