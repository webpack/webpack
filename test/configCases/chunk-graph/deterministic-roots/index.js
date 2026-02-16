import { getCombined } from "./a";

it("should produce deterministic output with cyclic dependencies", () => {
	const result = getCombined();
	expect(result).toContain("a");
	expect(result).toContain("b");
	expect(result).toContain("c");
});
