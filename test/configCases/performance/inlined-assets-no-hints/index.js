import big from "./big.svg";

it("should stay quiet when hints are off", () => {
	expect(big).toMatch(/^data:/);
	expect(__STATS__.hints).toHaveLength(0);
});
