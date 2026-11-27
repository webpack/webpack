it("should keep a chunk name inside the appended comment", async () => {
	globalThis.appendChunkNameRan = false;
	const mod = await import(
		/* webpackChunkName: "lazy\nglobalThis.appendChunkNameRan=true;//" */ "./lazy.js"
	);
	expect(mod.default).toBe("lazy");
	expect(globalThis.appendChunkNameRan).toBe(false);
	delete globalThis.appendChunkNameRan;
});
