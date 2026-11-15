it("should not touch the document for an asset hint on a target without one", () => {
	const url = new URL(/* webpackPrefetch: true */ "./image.png", import.meta.url);
	const preloaded = new URL(/* webpackPreload: true */ "./image.png?v=1", import.meta.url);
	expect(url.href).toMatch(/\.png$/);
	expect(preloaded.href).toMatch(/\.png\?v=1$/);
});
