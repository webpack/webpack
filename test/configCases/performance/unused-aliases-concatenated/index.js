import value from "./inner.js";

it("should look through concatenation for the request", () => {
	expect(value).toBe("aliased");
});
