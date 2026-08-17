const url = new URL("./asset.txt", import.meta.url);

// It used to reach the bundle verbatim, where `new URL(path, "app/")` throws.
it("should resolve a relative baseUri against the chunk", () => {
	expect(url.protocol).toBe("file:");
	expect(url.href).toContain("/app/assets/asset.txt");
});
