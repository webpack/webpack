it("should take the public path from the script when a callable element is named importScripts", () => {
	expect(typeof window.importScripts).toBe("function");
	expect(__webpack_public_path__).toBe("https://test.cases/path/inner/../");
});
