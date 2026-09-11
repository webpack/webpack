// `shared` moves between its own split chunk and b's chunk as b's import comes
// and goes, so the chunk each module id resolves through changes with it.
it("should load through chunks regrouped since the cached build", () => {
	const step = Number(WATCH_STEP);
	return Promise.all([import("./a"), import("./b")]).then(([a, b]) => {
		expect(a.fromA).toBe(`a-shared-${step}`);
		expect(b.fromB).toBe(step === 1 ? "b-alone" : `b-shared-${step}`);
	});
});
