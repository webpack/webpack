import { used } from "tidy";

it("should stay silent once the package declares sideEffects", () => {
	expect(used).toBe(1);
	expect(__STATS__.hints).toHaveLength(0);
});
