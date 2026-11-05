it("should take the public path from the script when a window has an importScripts function", () => {
	expect(typeof window.importScripts).toBe("function");
	expect(__webpack_public_path__).toBe("https://test.cases/path/inner/../");
});
