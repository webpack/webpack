const secondOnly = "second";

// Both entry modules share the startup scope (no per-entry IIFE); their disjoint
// top-level names don't clash, so each runs correctly.
it("the second inlined entry shares scope without collisions", () => {
	expect(secondOnly).toBe("second");
});
