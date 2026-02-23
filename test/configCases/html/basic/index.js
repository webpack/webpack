const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should emit an HTML asset", () => {
	const htmlPath = path.resolve(__dirname, "page.html");
	expect(fs.existsSync(htmlPath)).toBe(true);

	const html = fs.readFileSync(htmlPath, "utf-8");
	expect(html).toContain("<!DOCTYPE html>");
	expect(html).toContain("<h1>Hello World</h1>");
});

it("should resolve script src to output filename", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	// The <script src="./app.js"> should be replaced with the output filename
	expect(html).toContain('<script src="page.js">');
});

it("should resolve link href to output CSS filename", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toContain('href="page.css"');
});

it("should resolve img src to output asset filename", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	// The img src should be replaced with the hashed asset filename
	expect(html).toMatch(/src="[a-f0-9]+\.png"/);
});

it("should list HTML module in stats", () => {
	const htmlModule = __STATS__.modules.find(m => m.name && m.name.includes("page.html"));
	expect(htmlModule).toBeDefined();
	expect(htmlModule.moduleType).toBe("html");
});
