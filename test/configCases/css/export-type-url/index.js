it("should export URL string when exportType is url", () => {
	const urlCss = new URL("./url.css", import.meta.url);
	
	expect(urlCss.href).toMatch(/\.css$/);
	expect(urlCss.href).toMatch(/bundle\.main\.[a-f0-9]+\.css$/);
	
	// Extract filename from URL
	const match = urlCss.href.match(/bundle\.main\.[a-f0-9]+\.css$/);
	expect(match).toBeTruthy();
	const cssFilename = match[0];

	const fs = __non_webpack_require__("fs");
	const source = fs.readFileSync(__dirname + `/${cssFilename}`, "utf-8");
	expect(source).toMatchSnapshot();
});

