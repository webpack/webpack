const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should emit an HTML asset with multiple dependencies", () => {
	const htmlPath = path.resolve(__dirname, "page.html");
	expect(fs.existsSync(htmlPath)).toBe(true);
	const html = fs.readFileSync(htmlPath, "utf-8");
	expect(html).toContain("<!DOCTYPE html>");
	expect(html).toContain("Multiple Assets");
});

it("should resolve multiple script tags", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	// Both script srcs should be resolved
	const scriptMatches = html.match(/<script src="[^"]+"/g);
	expect(scriptMatches).not.toBeNull();
	expect(scriptMatches.length).toBe(2);
});

it("should resolve multiple link tags", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	const linkMatches = html.match(/<link rel="stylesheet" href="[^"]+"/g);
	expect(linkMatches).not.toBeNull();
	expect(linkMatches.length).toBe(2);
});

it("should resolve multiple img tags", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	// Both img srcs should be replaced with hashed filenames
	const imgMatches = html.match(/<img src="[a-f0-9]+\.png"/g);
	expect(imgMatches).not.toBeNull();
	expect(imgMatches.length).toBe(2);
});
