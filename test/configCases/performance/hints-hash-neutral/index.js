import { used } from "leaky";

it("should keep the hash when a hint reports", () => {
	expect(used).toBe(1);

	const [off, on] = __STATS__.children;

	// The hint has to fire, or the two hashes would match for no reason.
	expect(off.warnings).toHaveLength(0);
	expect(on.warnings).toHaveLength(1);
	expect(on.warnings[0].message).toMatch(/missing sideEffects:/);

	// `Compilation.createHash` folds every message into the hash, so a hint
	// reported before it would rename every `[fullhash]` asset.
	expect(on.hash).toBe(off.hash);
});
