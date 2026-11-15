it("should match fresh exports and the expected result after each edit", () => {
	const expected = require("./step.json");
	expect(STATS_JSON.errors.length > 0).toBe(expected.errors);
	if (expected.errors) return;
	const actual = JSON.parse(JSON.stringify(require(BUNDLE_PATH).default));
	expect(actual).toEqual(expected.result);
	expect(actual).toEqual(JSON.parse(JSON.stringify(require(FRESH_BUNDLE_PATH).default)));
});
