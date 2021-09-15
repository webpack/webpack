import external from "external";

it("should harmony import a dependency", function() {
	expect(external).toBe("abc");
});
