import movable, { broken } from "./dep";

it("should report a const that is written to", () => {
	expect(movable).toBe(4);
	expect(broken).toBeInstanceOf(Function);
});
