it("should pre-load chunks with a Promise-chain fallback when async is unsupported", async () => {
	const context = new AudioContext();
	await context.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));
	const factory = context.audioWorklet.registrations.get("test");
	expect(typeof factory).toBe("function");
	expect(await factory("ok")).toBe("OK-V/DONE");
});
