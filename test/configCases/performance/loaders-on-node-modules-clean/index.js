import total from "dep";

it("should stay quiet when the rule excludes node_modules", () => {
	expect(total).toBe(66);
});
