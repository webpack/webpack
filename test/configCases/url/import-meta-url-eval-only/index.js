it("should still bundle a resolvable asset", () => {
	const url = new URL("./file.png", import.meta.url);
	expect(url.pathname).toMatch(/\.png$/);
	expect(url.pathname.includes("file.png")).toBe(false);
});

it("should keep a missing file as a runtime URL and warn", () => {
	const url = new URL("./missing.png", import.meta.url);
	expect(url.href).toBe("https://test.cases/path/missing.png");
});

it("should keep absolute URLs as runtime URLs and warn", () => {
	const url = new URL("https://example.com/image.png", import.meta.url);
	expect(url.href).toBe("https://example.com/image.png");
});

it("should keep data: URLs as runtime URLs and warn", () => {
	const url = new URL("data:text/plain,hello", import.meta.url);
	expect(url.href).toBe("data:text/plain,hello");
});

it("should keep directory references as runtime URLs and warn", () => {
	const url = new URL("./", import.meta.url);
	expect(url.href).toBe("https://test.cases/path/");
});

it("should not emit a warning when webpackIgnore is used", () => {
	const url = new URL(/* webpackIgnore: true */ "./also-missing.png", import.meta.url);
	expect(url.href).toBe("https://test.cases/path/also-missing.png");
});

it("should leave standalone import.meta.url untouched", () => {
	expect(import.meta.url.startsWith("file://")).toBe(true);
	expect(import.meta.url.endsWith("index.js")).toBe(true);
});
