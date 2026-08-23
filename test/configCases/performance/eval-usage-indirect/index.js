const indirect = eval;

it("should stay quiet for indirect eval", () => {
	expect(indirect("1 + 1")).toBe(2);
	expect(__STATS__.warnings).toHaveLength(0);
});
