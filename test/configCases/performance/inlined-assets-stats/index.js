import big from "./big.svg";

it("should report through the stats channel", () => {
	expect(big).toMatch(/^data:/);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/inlined assets/);
	expect(__STATS__.warnings).toHaveLength(0);
});
