it("should keep a chunk name inside the banner comment", async () => {
	globalThis.bannerChunkNameRan = false;
	const mod = await import(
		/* webpackChunkName: "lazy*\x2f;globalThis.bannerChunkNameRan=true;\x2f*" */ "./lazy.js"
	);
	expect(mod.default).toBe(42);
	expect(globalThis.bannerChunkNameRan).toBe(false);
	delete globalThis.bannerChunkNameRan;
});
