import value from "dll/module";

it("should not scope hoist delegated modules", function() {
	expect(value).toBe("ok");
});
