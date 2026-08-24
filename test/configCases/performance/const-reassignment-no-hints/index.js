import movable, { broken } from "./dep";

it("should report a const that is written to", () => {
	expect(movable).toBe(4);
	expect(broken).toBeInstanceOf(Function);

	expect(__STATS__.hints).toHaveLength(0);
});
