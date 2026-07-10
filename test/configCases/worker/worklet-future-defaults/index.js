it("should enable worklet parsing under futureDefaults", async () => {
	const context = new AudioContext();
	await context.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));
	const factory = context.audioWorklet.registrations.get("test");
	expect(typeof factory).toBe("function");
	expect(factory("ok")).toBe("ok!");
});
