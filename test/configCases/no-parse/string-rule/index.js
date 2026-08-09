it("should not parse a module whose request starts with the string rule", () => {
	expect(require("./not-parsed-a")).toBe("a");
});

it("should parse every other module", () => {
	expect(require("./parsed")).toBe("parsed dep");
});
