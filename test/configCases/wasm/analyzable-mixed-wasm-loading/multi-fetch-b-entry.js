// Loads the same chunk as `multi-fetch-a`, so the chunk carries both runtime keys.
export const load = () =>
	import(/* webpackChunkName: "multi-lazy" */ "./multi-lazy");

it("should keep the shared chunk reachable from the second runtime", () => {
	expect(typeof load).toBe("function");
});
