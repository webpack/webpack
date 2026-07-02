it("should not resolve a directory reference as a module and keep `new URL(...)` as-is", () => {
	const dotSlash = new URL("./", import.meta.url);
	expect(dotSlash.href.endsWith("/")).toBe(true);

	const dot = new URL(".", import.meta.url);
	expect(dot.href.endsWith("/")).toBe(true);

	const parent = new URL("../", import.meta.url);
	expect(parent.href.endsWith("/")).toBe(true);

	const subDir = new URL("./folder/", import.meta.url);
	expect(subDir.href.endsWith("/folder/")).toBe(true);
});
