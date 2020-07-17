it("should parse nullish coalescing correctly", () => {
	let result;

	if ((null ?? false) === null) {
		result = require("./b");
	} else if ((0 ?? false) === 0) {
		result = require("./a");
	}

	expect(result).toBe(1);
});

it("should evaluate module.hot to nullish", () => {
	if (module.hot ?? true) {
		if (module.hot) {
			throw new Error("module.hot should be falsy");
		}
		expect(true).toBe(true);
	}
});
