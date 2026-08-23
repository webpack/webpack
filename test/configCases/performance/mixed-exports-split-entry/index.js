import { named } from "./named-only";

it("should report a default and named exports from different entry modules", () => {
	expect(named).toBe(2);
	expect(__STATS__.warnings).toHaveLength(1);
});
