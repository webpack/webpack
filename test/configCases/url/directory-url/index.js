it("should handle new URL('./', import.meta.url) without module resolution error", () => {
	// Previously threw: "Can't resolve './' in '/path/to/dir'"
	// Directory paths are not module assets; they should resolve at runtime relative to bundle base URI.
	const dirUrl = new URL("./", import.meta.url);
	expect(dirUrl).toBeInstanceOf(URL);
	// Should be a valid URL ending with '/' (a directory URL)
	expect(dirUrl.href).toMatch(/\/$/);
});

it("should handle new URL('subdir/', import.meta.url) without module resolution error", () => {
	const subdirUrl = new URL("subdir/", import.meta.url);
	expect(subdirUrl).toBeInstanceOf(URL);
	expect(subdirUrl.href).toMatch(/subdir\/$/);
});
