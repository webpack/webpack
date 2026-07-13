it("should load a module worklet and its split chunk via native import", async () => {
	const context = new AudioContext();
	await context.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));
	const factory = context.audioWorklet.registrations.get("test");
	expect(typeof factory).toBe("function");
	// upper (entry) + VENDOR (split chunk linked by the worklet's native `import`)
	expect(factory("ok")).toBe("OK-V");
});
