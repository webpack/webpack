import big from "./big.svg";

it("should stay quiet when the asset is emitted as a file", () => {
	expect(big).not.toMatch(/^data:/);
	expect(__STATS__.warnings).toHaveLength(0);
});
