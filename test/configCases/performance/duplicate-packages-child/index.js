const DUPLICATE = /Multiple versions of the package "child-lib"/;

it("should include both versions of the duplicated package", () => {
	expect(require("child-lib")).toBe("child-lib@2.0.0");
	expect(require("child-consumer")).toBe("child-lib@1.0.0");
});

it("should not repeat the hint for every child compilation", () => {
	for (const child of __STATS__.children) {
		expect(child.warnings.filter((w) => DUPLICATE.test(w.message))).toEqual([]);
	}
});
