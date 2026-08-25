import value from "./dep";

it("should report through the error channel", () => {
	expect(value).toBe("value");
});
