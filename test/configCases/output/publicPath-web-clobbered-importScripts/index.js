it("should take the public path from the script when an element is named importScripts", () => {
	expect(typeof window.importScripts).toBe("object");
	expect(__webpack_public_path__).toBe("https://test.cases/path/inner/../");
});
