import leaf from "@w/leaf";

it("should not let a wildcard match when the alias is exact-only", () => {
	expect(leaf).toBe("leaf");
});
