it("should report the duplicated package as a hint only", () => {
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(
		/Multiple versions of the package "dup-lib"/
	);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});

it("should include both versions of the duplicated package", () => {
	expect(require("dup-lib")).toBe("dup-lib@2.0.0");
	expect(require("dup-consumer")).toBe("dup-lib@1.0.0");
});

it("should ignore modules without a version in the description file", () => {
	expect(require("no-version-lib")).toBe("no-version-lib");
});

it("should ignore modules without a description file", () => {
	expect(require("data:text/javascript,export default 42").default).toBe(42);
});
