it("should detect audioWorklet.addModule() from the default syntax", async () => {
	const context = new AudioContext();
	await context.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));
	const factory = context.audioWorklet.registrations.get("test");
	expect(factory("ok")).toBe("OK");
});

it("should detect CSS.paintWorklet.addModule() from the default syntax", async () => {
	await CSS.paintWorklet.addModule(new URL("./worklet.js", import.meta.url));
	const factory = CSS.paintWorklet.registrations.get("test");
	expect(factory("ok")).toBe("OK");
});
