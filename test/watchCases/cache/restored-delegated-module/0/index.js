import value from "dll/item";

it("should read the delegated module from the dll", () => {
	expect(value).toBe("dll-default");
});
