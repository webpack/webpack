const path = require("path");

it("should report both hints through the stats channel", () => {
	expect(USED_FLAG).toBe(true);
	expect(typeof path.join).toBe("function");

	const messages = __STATS__.hints.map((hint) => hint.message).sort();

	expect(messages).toHaveLength(2);
	expect(messages[0]).toMatch(
		/webpack define recommendations[\s\S]*never referenced by any module: UNUSED_FLAG\./
	);
	expect(messages[1]).toMatch(
		/webpack externals recommendations[\s\S]*never imported: never-imported\./
	);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
