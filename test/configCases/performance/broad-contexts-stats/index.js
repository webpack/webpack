const locales = require.context("./locale");

it("should report through the stats channel", () => {
	expect(locales.keys().length).toBe(40);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(
		/broad contexts: 1 context matches every file under a directory/
	);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
