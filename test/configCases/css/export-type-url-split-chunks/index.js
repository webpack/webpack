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

	// The CSS file must contain BOTH the local and shared styles.
	// If splitChunks extracted shared-lib/shared.css into a vendor chunk,
	// the URL would point to an incomplete file missing .shared.
	expect(cssContent).toContain(".local");
	expect(cssContent).toContain(".shared");
});
