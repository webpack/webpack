import { used } from "./barrel";

it("should report through the stats channel", () => {
	expect(used).toBe(3);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(
		/unused re-exports: 1 module is bundled although nothing uses what they export, adding \d+ bytes:\n {2}\.\/twice\.js \(\d+ bytes\)/
	);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
