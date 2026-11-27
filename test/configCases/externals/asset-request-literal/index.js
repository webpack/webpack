it("should keep an asset external request a string", () => {
	global.assetRequestRan = false;
	const url = new URL(
		'"data:,"); global.assetRequestRan = true; ([].png',
		import.meta.url
	);
	const logo = new URL("https://example.test/logo.png", import.meta.url);
	expect(global.assetRequestRan).toBe(false);
	expect(url.href).toMatch(/\.png$/);
	expect(logo.href).toBe("https://example.test/logo.png");
	delete global.assetRequestRan;
});
