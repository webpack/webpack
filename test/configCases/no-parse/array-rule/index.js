it("should stop at the first matching rule of the array", () => {
	// matched by the string rule (element 0)
	expect(require("./not-parsed-a")).toBe("a");
	// matched by the regexp rule (element 1)
	expect(require("./not-parsed-b")).toBe("b");
});

it("should parse a module no rule matches", () => {
	expect(require("./parsed")).toBe("parsed dep");
});
