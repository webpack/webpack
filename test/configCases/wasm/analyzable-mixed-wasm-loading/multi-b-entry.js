// Loads the same chunk as `multi-a`, so the chunk carries both runtime keys.
it("should reach the shared chunk from the second runtime too", async () => {
	const { run } = await import(
		/* webpackChunkName: "multi-lazy" */ "./multi-lazy"
	);

	expect(run()).toBe(42);
});
