it("show override request", async () => {
	const decoder = new TextDecoder('utf-8');
	const mod = "file.ext";
	const loadedMod = (await import(`./files/${mod}`, { with: { type: "bytes" } })).default;
	const text = decoder.decode(loadedMod);

	expect(JSON.parse(text)).toEqual({ foo: "bar" });

	const otherLoadedMod = (await import(`./files/${mod}`, { with: { type: "json" } })).default;

	expect(otherLoadedMod.foo).toBe("bar");
});
