import value from "./dep";

it("should report a production build that embeds its source map", () => {
	expect(value).toBe("value");
});
