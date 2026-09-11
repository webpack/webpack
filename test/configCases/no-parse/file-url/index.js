it("should not parse modules matching file URLs in noParse", () => {
	expect(require("./not-parsed-a")).toBe("a");
	expect(require("./not-parsed-b")).toBe("b");
});

it("should parse other modules", () => {
	expect(require("./parsed")).toBe("parsed dep");
});
