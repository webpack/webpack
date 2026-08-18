import { used } from "leaky";

it("should name the package whose missing declaration costs bytes", () => {
	expect(used).toBe(1);

	const hints = __STATS__.hints.filter((hint) =>
		/missing sideEffects:/.test(hint.message)
	);

	expect(hints).toHaveLength(1);
	expect(hints[0].message).toMatch(/leaky \(\d+ bytes in 1 module\)/);
});
