import value from "@a/b/c";

it("should report an alias shadowed by an earlier one", () => {
	expect(value).toBe("from dirA");
});
