import value from "./dep";

it("should stay quiet when hints are off", () => {
	expect(value).toBe("value");
	expect(__STATS__.hints).toHaveLength(0);
});
