it("should keep an asset external request a string", () => {
	globalThis.assetRequestRan = false;
	const url = new URL(
		'"data:,"); globalThis.assetRequestRan = true; ([].png',
		import.meta.url
	);
	const logo = new URL("https://example.test/logo.png", import.meta.url);
	expect(globalThis.assetRequestRan).toBe(false);
	expect(url.href).toMatch(/\.png$/);
	expect(logo.href).toBe("https://example.test/logo.png");
	delete globalThis.assetRequestRan;
});
