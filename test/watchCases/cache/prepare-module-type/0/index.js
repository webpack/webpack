import value from "./value.txt";

it("should prepare a module type before creating its parser", () => {
	expect(value.trim()).toBe("first");
});
