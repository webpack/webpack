import big from "./big.svg";

it("should report through the error channel", () => {
	expect(big).toMatch(/^data:/);
});
