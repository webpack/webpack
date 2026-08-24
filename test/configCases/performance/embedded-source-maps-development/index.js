import value from "./dep";

it("should stay quiet outside a production build", () => {
	expect(value).toBe("value");
	expect(__STATS__.warnings).toHaveLength(0);
});
