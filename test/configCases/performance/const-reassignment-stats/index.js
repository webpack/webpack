import movable, { broken } from "./dep";

it("should report a const that is written to", () => {
	expect(movable).toBe(4);
	expect(broken).toBeInstanceOf(Function);

	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/const reassignment/);
	expect(__STATS__.warnings).toHaveLength(0);
});
