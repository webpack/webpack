import big from "./big.svg";
import first from "./first.svg";
import second from "./second.svg";

it("should report an asset inlined past the point it pays off", () => {
	expect(big).toMatch(/^data:/);
	expect(first).toMatch(/^data:/);
	expect(second).toMatch(/^data:/);
	// The two smaller ones are the same size, so only their names order them.
	expect(first.length).toBe(second.length);
});
