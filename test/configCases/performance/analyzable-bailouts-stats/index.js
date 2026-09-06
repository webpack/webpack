const url = new URL("./file.txt", import.meta.url);

it("should report through the stats channel", () => {
	expect(url.href).toMatch(/\.txt$/);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(
		/analyzable ESM output: 1 reference keeps the runtime form:\n {2}devtool "eval" wraps the module in eval\(\), where import\.meta does not parse\n {4}\.\/index\.js/
	);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
