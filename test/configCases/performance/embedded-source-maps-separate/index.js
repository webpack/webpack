import value from "./dep";

it("should stay quiet when the map is a separate file", () => {
	expect(value).toBe("value");
	expect(__STATS__.warnings).toHaveLength(0);
});
