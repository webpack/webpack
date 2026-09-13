it("should apply a rule whose `test` is a file URL", function () {
	expect(require("./matched")).toBe("MARKER-test");
});

it("should apply a rule whose `include` is a file URL", function () {
	expect(require("./directory/included")).toBe("MARKER-include");
});

it("should apply a rule whose `test` is a file URL with a single slash", function () {
	expect(require("./short-url")).toBe("MARKER-short-url");
});
