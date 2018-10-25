const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "cache pack",
		cache: {
			type: "filesystem",
			store: "pack"
		}
	});
});
