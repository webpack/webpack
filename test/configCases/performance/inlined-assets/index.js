import big from "./big.svg";

it("should report an asset inlined past the point it pays off", () => {
	expect(big).toMatch(/^data:/);
});
