import { direct, name, other } from "./consumer";

it("should not mangle exports read through a whole-namespace require(esm)", () => {
	expect(name).toBe("target");
	expect(other).toBe("other");
});

it("should keep a tracked access on the same module working", () => {
	expect(direct).toBe("target");
});
