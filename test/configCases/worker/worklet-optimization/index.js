it("should pre-load split and runtime chunks into the worklet", async () => {
	const context = new AudioContext();
	await context.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));
	const factory = context.audioWorklet.registrations.get("test");
	expect(typeof factory).toBe("function");
	// upper (entry) + VENDOR (split chunk) + suffix (async chunk) all resolved
	expect(await factory("ok")).toBe("OK-V/DONE");
});
