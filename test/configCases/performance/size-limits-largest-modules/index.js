require("./big.js");
require("./small.js");

it("should name the largest modules inside an oversized asset", () => {
	expect(__STATS__.hints).not.toHaveLength(0);

	const message = __STATS__.hints
		.map((hint) => hint.message)
		.find((text) => /asset size limit/.test(text));

	expect(message).toBeDefined();
	expect(message).toMatch(/Largest modules: /);
	// The dominant module must come first, ahead of the tiny one.
	const largest = /Largest modules: ([^\n]*)/.exec(message)[1];
	expect(largest.indexOf("big.js")).toBeGreaterThan(-1);
	expect(largest.indexOf("small.js")).toBeGreaterThan(-1);
	expect(largest.indexOf("big.js")).toBeLessThan(largest.indexOf("small.js"));
});
