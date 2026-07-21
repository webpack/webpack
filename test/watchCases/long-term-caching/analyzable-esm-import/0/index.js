it("should follow the re-hashed chunk filename across rebuilds", async () => {
	const { value } = await import(/* webpackChunkName: "dynamic" */ "./dynamic");

	// The previous step's chunk file stays on disk, so a stale baked literal
	// would still resolve — and return the old value.
	expect(value).toBe(+WATCH_STEP);
});
