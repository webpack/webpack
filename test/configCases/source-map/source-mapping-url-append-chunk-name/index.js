it("should keep a chunk name inside the appended comment", async () => {
	global.appendChunkNameRan = false;
	const mod = await import(
		/* webpackChunkName: "lazy\nglobal.appendChunkNameRan=true;//" */ "./lazy.js"
	);
	expect(mod.default).toBe("lazy");
	expect(global.appendChunkNameRan).toBe(false);
	delete global.appendChunkNameRan;
});
