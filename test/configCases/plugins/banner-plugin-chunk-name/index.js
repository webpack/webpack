it("should keep a chunk name inside the banner comment", async () => {
	global.bannerChunkNameRan = false;
	const mod = await import(
		/* webpackChunkName: "lazy*\x2f;global.bannerChunkNameRan=true;\x2f*" */ "./lazy.js"
	);
	expect(mod.default).toBe(42);
	expect(global.bannerChunkNameRan).toBe(false);
	delete global.bannerChunkNameRan;
});
