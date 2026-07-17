import "./dep1.js";

it("should throw before evaluating a dependency when a transitive dep of a deferred module is still evaluating", () => {
	expect(globalThis.deferTransitiveError).toBeInstanceOf(TypeError);
	// The throw must happen before any evaluation, so dep3 must not have run.
	expect(globalThis.dep3Evaluated).toBe(false);
});
