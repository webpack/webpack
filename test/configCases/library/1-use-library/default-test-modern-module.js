import d from "library";

it("should tree-shake other exports from library (" + NAME + ")", function() {
	expect(d).toBe("default-value");
});
