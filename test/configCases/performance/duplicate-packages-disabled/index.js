it("should not report duplicate packages when hints are disabled", () => {
	expect(require("quiet-lib")).toBe("quiet-lib@2.0.0");
	expect(require("quiet-consumer")).toBe("quiet-lib@1.0.0");
});
