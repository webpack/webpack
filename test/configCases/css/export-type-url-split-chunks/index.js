it("should produce a complete CSS file when splitChunks is configured", () => {
	const url = new URL("./style.css", import.meta.url);
	expect(url).toBeInstanceOf(URL);
	expect(url.href).toMatch(/\.css$/);

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");

	// Read the CSS file the URL points to
	const cssFilename = path.basename(url.href);
	const cssContent = fs.readFileSync(
		path.resolve(__dirname, cssFilename),
		"utf-8"
	);

	// Incomplete if splitChunks pulled shared-lib out of the standalone entry.
	expect(cssContent).toContain(".local");
	expect(cssContent).toContain(".shared");
});
